import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.service.js";
import mongoose, { isValidObjectId } from "mongoose"

const addToWatchHistory = async ({videoId, userId}) => {
    try {
        const user = await User.findById(userId)
        await user.addToWatchHistory(videoId)
    } catch (error) {
        throw new ApiError(500, "Error while updating watch history")
    }
}

const publishVideo = asyncHandler ( async (req, res) => {
    const { title, description} = req.body
    // console.log(title, description);
    if ([title, description].some((feild) => feild.trim() === "")) {
        throw new ApiError(400, "Title and Description are required")
    }
    // Local file path //ERROR
    let videoFileLocalPath
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files.videoFile[0].path;
    } else {
        throw new ApiError(400, "Video file is required")
    }
    let thumbnailLocalPath
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    } else {
        throw new ApiError(400, "Thumbnail is required")
    }

    // Upload files to cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!(videoFile && thumbnail)) {
        throw new ApiError("unable to upload on cloudinary")
    }

    const video = await Video.create({
        videoFile: videoFile.secure_url,
        videoCloudinaryID: videoFile.public_id,
        thumbnail: thumbnail.secure_url,
        thumbnailCloudinaryID: thumbnail.public_id,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user?._id
    })

    const videoData = await Video.findById(video._id)
    if (!videoData) {
        throw new ApiError(500, "Error while uploading video on server")
    }

    return res.status(200).json(
            new ApiResponse(
                200,
                videoData,
                "Video uploaded successfully"
            )
        )
})

const getVideoById = asyncHandler(async (req, res) => {
    //get video by id and update video view by one
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "videoId is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "invalid request by videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(401, "Video not found")
    } else {
        // video.views = video.views + 1
        // await video.save()
    }

    const pipeline = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        },
        // {
        //     $set: {
        //         views: { $add: ['$views', 1] } // Increment the view count by 1
        //     }
        // }
    ]

    // fetch data from database
    const videoData = await Video.aggregate(pipeline)
    if (!videoData) {
        throw new ApiError(500, "Error while fetching video")
    }

    // Convert ObjectId instances to strings for comparison
    const ownerId = videoData[0].owner._id.toString();
    const userId = req.user._id.toString();

    let owner = false
    let videoAccess = true
    const videoAccessMessage = {
        message: "🙄 Video removed by owner"
    }
    // Check if user is the owner
    if (ownerId == userId) {
        owner =  true
        // console.log("owner verified");
    }

    if (owner === false && videoData[0].isPublished === false) {
        console.log("Video Published status :", videoData.isPublished);
        videoAccess = false
        // throw new ApiError(404, "Video removed by owner")
    }

    // add to watch history
    addToWatchHistory(
        {
            videoId: videoData[0]._id,
            userId: req.user._id
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoAccess ? videoData[0] : videoAccessMessage,
                "Video data fetched successfully"
            )
        )
})

const updateVideoViewCount = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "videoId is required")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "invalid request by videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(401, "Video not found")
    }
    
    video.views = video.views + 1
    const updateVideo = await video.save()
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updateVideo,
                "view count updated successfully"
            )
        )
})

const updateVideo = asyncHandler(async (req, res) => {
    //update video details like title, description, thumbnail
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "videoID is required")
    }
    const { title, description} = req.body
    const thumbnailLocalPath = req.file?.path

    // if (!title && !description) {
    //     console.log("Title & description is not provided")
    // }

    // if (!thumbnailLocalPath) {
    //    console.log("thumbnail is not provided");
    // }

    // fetch video data by id
    const videoData = await Video.findById(videoId)
    if (!videoData) {
        throw new ApiError("Video not found with the provided ID")
    }

    // console.log(videoData.owner)
    // console.log(req.user._id)

    // Convert ObjectId instances to strings for comparison
    const ownerId = videoData.owner.toString();
    const userId = req.user._id.toString();

    // Check if user is the owner
    if (ownerId !== userId) {
        throw new ApiError(400, "Only owners are allowed to make changes");
    }

    // upload thumbnail on cloudinary and delete old file
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    // console.log(thumbnail);
    if (thumbnail) {
        await deleteFromCloudinary(videoData.thumbnailCloudinaryID)
    }

    // update video data
    videoData.title = title || videoData.title
    videoData.description = description || videoData.description
    if (thumbnail) {
        videoData.thumbnail = thumbnail.secure_url
        videoData.thumbnailCloudinaryID = thumbnail.public_id
    }

    const updatedVideoData = await videoData.save({ validateBeforeAve: false })
    if (!updatedVideoData) {
        throw new ApiError(500, "Error while updating video data")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedVideoData,
                "Video data updated successfully"
            )
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    //deletes video from database as well as from cloudinary
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "videoID is required")
    }

    const videoData = await Video.findById(videoId)
    if (!videoData) {
        throw new ApiError(400, "Video not found")
    }
    // console.log(videoData.videoCloudinaryID);
    // console.log(videoData.thumbnailCloudinaryID);

    // Convert ObjectId instances to strings for comparison
    const ownerId = videoData.owner.toString();
    const userId = req.user._id.toString();

    // Check if user is the owner
    if (ownerId !== userId) {
        throw new ApiError(400, "Only owners are allowed to make changes");
    }

    // deleting fomr cloudinary
    try {
        await deleteFromCloudinary(null, videoData.videoCloudinaryID)
    } catch (error) {
        throw new ApiError(500, "Error while deleting video from cloudinary")
    }
    try {
        await deleteFromCloudinary(videoData.thumbnailCloudinaryID)
    } catch (error) {
        throw new ApiError(500, "Error while deleting thumbnail from cloudinary")
    }

    // delete from database
    await Video.findByIdAndDelete(videoId)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video deleted successfully"
            )
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "videoID is required")
    }
    
    const videoData = await Video.findById(videoId).select("-password")
    if (!videoData) {
        throw new ApiError(400, "Video not found")
    }

    // Convert ObjectId instances to strings for comparison
    const ownerId = videoData.owner.toString();
    const userId = req.user._id.toString();

    // Check if user is the owner
    if (ownerId !== userId) {
        throw new ApiError(400, "Only owners are allowed to make changes");
    }

    videoData.isPublished = !videoData.isPublished
    const { isPublished } = await videoData.save({ validateBeforeAve: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished },
                "Toggled published status successfully"
            )
        )
})

const getAllVideos = asyncHandler(async (req, res) => {
    //get all videos based on query, sort, pagination
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    if (Number(page) === 0) {
        throw new ApiError(400, "page number should be at least 1 or higher")
    }

    const skip = (Number(page) - 1) * Number(limit);
    const searchText = query || "";

    let pipeline = [
        {
            $match: {
                isPublished: true,
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            avatarCloudinaryID: 1
                        },
                    },
                ],
            },
        },
        {
            //  * newField: The new field name.
            //  * expression: The new field expression.
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        },
        {
            // * query: The query in MQL.
            $match: {
                title: {
                    $regex: searchText,
                    $options: "i", // Case-insensitive search
                },
            },
        },
        {
            //  * Provide the number of documents to skip.
            $skip: Number(skip),
        },
        {
            // * Provide the number of documents to limit.
            $limit: Number(limit),
        },
    ];

    if (sortBy) {
        if (sortBy == "asc" || sortBy == "des") {
            // sortBy : if (asc : 1) and (des : -1)
            const sortValue = sortBy == "asc" ? 1 : -1 ;
            // console.log(sortValue);
            pipeline.push(
                {
                $sort:
                    // * Provide any number of field/order pairs.
                    {
                    duration: sortValue,
                    },
                }
            )
        } else {
            throw new ApiError(400, "sortBy value should be ASC or DES")
        }
    }

    if (userId) {
        pipeline = [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            ...pipeline
        ]
    }

    const videoData = await Video.aggregate(pipeline)
    // console.log(videoData);

    // count total number of pages

    let pagecountPipeline = [
        {
            // * query: The query in MQL.
            $match: {
                title: {
                    $regex: searchText,
                    $options: "i", // Case-insensitive search
                },
            },
        },
        {
            $count: "totalDocuments"
        }
    ]

    if (userId) {
        pagecountPipeline = [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            ...pagecountPipeline
        ]
    }

    const totalDocumentsResult = await Video.aggregate(pagecountPipeline);

    const totalDocuments = totalDocumentsResult.length > 0 ? totalDocumentsResult[0].totalDocuments : 0;
    const totalPages = Math.ceil(totalDocuments / Number(limit));
    // console.log("Total pages:", totalPages);

    return res
        .status(200)
        .json(
            new ApiResponse(
            200,
            {
                videoData, 
                totalPages
            },
            "Videos are fetched successfully"
            )
        )
})

export {
    publishVideo,
    getVideoById,
    updateVideo,
    updateVideoViewCount,
    deleteVideo,
    togglePublishStatus,
    getAllVideos
}