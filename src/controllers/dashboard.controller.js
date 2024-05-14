import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user._id

    try {
        const pipeline_views = [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId) //ObjectId('_id')
                }
            },
            {
                $group: {
                    _id: null,
                    totalViews: {
                    $sum: "$views"
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalViews: 1
                }
            }
        ]
        const pipeline_sub_count = [
            {
                $match: {
                    channel : new mongoose.Types.ObjectId(userId) //ObjectId('_id')
                }
            },
            {
                $count: 'subscriber_count'
            }
        ]
        const pipeline_vid_count = [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId) //ObjectId('_id')
                }
            },
            {
                $count: 'video_count'
            }
        ]
    
        const channelTotalLifeTimeViews = await Video.aggregate(pipeline_views)
        const totalSubscribersCount = await Subscription.aggregate(pipeline_sub_count)
        const totalUploadedVideoCount = await Video.aggregate(pipeline_vid_count)
    
        const dasboardData = {
            totalChannelsViews : channelTotalLifeTimeViews[0]?.totalViews || 0,
            totalSubscribersCount : totalSubscribersCount[0]?.subscriber_count || 0,
            totalVideoCount : totalUploadedVideoCount[0]?.video_count || 0
        }
    
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    dasboardData,
                    "Channel stats fetched successfully"
                )
            )
    } catch (error) {
        console.log(`Error while fetching stats ${error.message}`)
        throw new ApiError(500, `Error while fetching stats ${error.message}`)
    }
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const userId = req.user._id
    const { page = 1, limit = 10, query, sortBy} = req.query

    if (Number(page) === 0) {
        throw new ApiError(400, "page number should be at least 1 or higher")
    }

    const skip = (Number(page) - 1) * Number(limit);
    const searchText = query || "";

    let pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
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

    const videosData = await Video.aggregate(pipeline)

    // count total number of pages

    let pagecountPipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
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
            $count: "totalDocuments"
        }
    ]

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
                videosData, 
                totalPages
            },
            "Videos are fetched successfully"
            )
        )
})

export {
    getChannelStats, 
    getChannelVideos
    }