import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    //toggle like on video
    const {videoId} = req.params
    if (!videoId) throw new ApiError(400, "videoId is required")

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid  UserId")

    const likeData = await Like.findOne(
        {
            video: videoId,
            likedBy: req.user._id 
        }
    )
    // console.log(likeData);

    let response
    let liked
    try {
        if (likeData) {
            response = await Like.deleteOne(
                {
                    video: videoId, 
                    likedBy: req.user._id
                }
            )
            liked = false
            // console.log(`Deleted like :: ${videoId}`);
        } else {
            response = await Like.create(
                {
                    video: videoId,
                    likedBy: req.user._id
                }
            )
            liked = true
            // console.log(`new like added to :: ${videoId}`);
        }
    } catch (error) {
        console.error("toggleLike error ::", error);
        throw new ApiError(500, error?.message || "Internal server error in toggleLike")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {response, liked},
                "toggled Like successfully"
            )
        )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    // toggle like on comment
    const {commentId} = req.params
    if (!commentId) throw new ApiError(400, "commentId is required")

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid  commentId")

    const likeData = await Like.findOne(
        {
            comment: commentId,
            likedBy: req.user._id 
        }
    )
    // console.log(likeData);

    let response
    let liked
    try {
        if (likeData) {
            response = await Like.deleteOne(
                {
                    comment: commentId, 
                    likedBy: req.user._id
                }
            )
            liked = false
            // console.log(`Deleted like :: ${commentId}`);
        } else {
            response = await Like.create(
                {
                    comment: commentId,
                    likedBy: req.user._id
                }
            )
            liked = true
            // console.log(`new like added to :: ${commentId}`);
        }
    } catch (error) {
        console.error("toggleLike error ::", error);
        throw new ApiError(500, error?.message || "Internal server error in toggleLike")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {response, liked},
                "toggled Like successfully"
            )
        )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    // toggle like on tweet
    const {tweetId} = req.params
    if (!tweetId) throw new ApiError(400, "tweetId is required")

    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid  tweetId")

    const likeData = await Like.findOne(
        {
            comment: tweetId,
            likedBy: req.user._id 
        }
    )
    // console.log(likeData);

    let response
    let liked
    try {
        if (likeData) {
            response = await Like.deleteOne(
                {
                    tweet: tweetId, 
                    likedBy: req.user._id
                }
            )
            liked = false
            // console.log(`Deleted like :: ${tweetId}`);
        } else {
            response = await Like.create(
                {
                    tweet: tweetId,
                    likedBy: req.user._id
                }
            )
            liked = true
            // console.log(`new like added to :: ${tweetId}`);
        }
    } catch (error) {
        console.error("toggleLike error ::", error);
        throw new ApiError(500, error?.message || "Internal server error in toggleLike")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {response, liked},
                "toggled Like successfully"
            )
        )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    // get all liked videos
    const {page = 1, limit = 10} = req.query
    if (Number(page) === 0) {
        throw new ApiError(400, "page number should be at least 1 or higher")
    }

    const skip = (Number(page) - 1) * Number(limit);

    const pipeline = [
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: {
                    $exists: true, // Match documents where the "video" field exists
                },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            isPublished: 1,
                            createdAt: 1
                        },
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
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt: ["$owner", 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
                },
            },
        },
        {
            $match: {
              "video.isPublished": true // Match only documents where "isPublished" of embedded video is true
            }
        },
        {
            $skip: Number(skip)
        },
        {
            $limit: Number(limit)
        }
    ]

    const likedVideos = await Like.aggregate(pipeline)
    if (!likedVideos) throw new ApiError(500, "Error while fetching data from server")

    // count total number of pages
    const totalDocumentsResult = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: {
                    $exists: true, // Match documents where the "video" field exists
                },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            isPublished: 1
                        },
                    }
                ],
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
                },
            },
        },
        {
            $match: {
              "video.isPublished": true // Match only documents where "isPublished" of embedded video is true
            }
        },
        {
            $count: "totalDocuments"
        }
    ]);
    const totalDocuments = totalDocumentsResult.length > 0 ? totalDocumentsResult[0].totalDocuments : 0;
    const totalPages = Math.ceil(totalDocuments / Number(limit));
    // console.log("Total pages:", totalPages);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    likedVideos,
                    totalPages
                },
                "All liked video fetched successfully"
            )
        )
})

const getIsLiked = asyncHandler(async (req, res) => {
    // get all liked videos
    const { videoId } = req.params;
    if (!videoId) throw new ApiError(401, "videoId is required");

    const pipeline = [
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $project: {
                isLiked: { $literal: true } // Set isLiked to true if a document is found
            }
        }
    ];

    const result = await Like.aggregate(pipeline)
    .catch(error => {
        console.error('Error executing aggregation pipeline:', error);
        throw new ApiError(500, "Error executing aggregation pipeline:");
    })

    // If no documents found, set isLiked to false
    const isLiked = result.length > 0;
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked },
                "Liked status fetched successfully"
            )
        )
});


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getIsLiked
}