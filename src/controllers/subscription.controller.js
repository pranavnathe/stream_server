import mongoose, {isValidObjectId} from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // toggle subscription
    const {channelId} = req.params
    if (!channelId) throw new ApiError(400, "channelId is required")
    if (!isValidObjectId(channelId)) throw new ApiError(400, "invalid channelId")

    const subscriptionData = await Subscription.findOne(
        {
            subscriber: req.user._id,
            channel: channelId
        }
    )

    let response
    let isSubsribed

    try {
        if (subscriptionData) {
            response = await Subscription.deleteOne(
                {
                    subscriber: req.user._id,
                    channel: channelId
                }
            )
            isSubsribed = false
        } else {
            response = await Subscription.create(
                {
                    subscriber: req.user._id,
                    channel: channelId
                }
            )
            isSubsribed = true
        }
    } catch (error) {
        console.error("toggleSubscription error ::", error);
        throw new ApiError(500, error?.message || "Internal server error in toggleSubscription")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {response, isSubsribed}
            )
        )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!channelId) throw new ApiError(400, "channelId is required")
    if (!isValidObjectId(channelId)) throw new ApiError(400, "invalid channelId")

    const pipeline = [
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                            avatarCloudinaryID: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscriber: {
                    $first: "$subscriber"
                }
            }
        },
        {
            $project: {
                _id : 1,
                subscriber : 1
            }
        }
    ]

    const channelSubscribers = await Subscription.aggregate(pipeline)
    if (!channelSubscribers) throw new ApiError(400, "Error while fetching subscription data")

    // console.log(channelSubscribers)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelSubscribers,
                "channel subscription data fetched successfully"
            )
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!subscriberId) throw new ApiError("subscriberId is required")
    if (!isValidObjectId(subscriberId)) throw new ApiError(400, "invalid subscriberId")

    const pipeline = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                            avatarCloudinaryID: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $match: {
                "channel": { $ne: [] }
            }
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel"
                }
            }
        },
        {
            $project: {
                _id : 1,
                channel : 1
            }
        }
    ]

    const subscribedChannels = await Subscription.aggregate(pipeline)
    if (!subscribedChannels) throw new ApiError(400, "Error while fetching subscription data")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "successfully fetched user subscribed channel's"
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}