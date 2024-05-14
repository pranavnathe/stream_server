import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.service.js"

const check_owner = (ownerID, userID) => {
    // Convert ObjectId instances to strings for comparison
    const createrID = ownerID.toString();
    const userId = userID.toString();

    // Check if user is the owner
    if (createrID !== userId) {
        throw new ApiError(400, "Only owners are allowed to make changes");
    } else {
        return true
    }
}

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    if (!content) throw new ApiError(400, "content is required")

    let tweetImageLocalPath = req.file?.path
    if (!tweetImageLocalPath) console.log("tweet image is not provided");
    // console.log(tweetImageLocalPath);

    // upload to cloudinary
    const tweetImage = await uploadOnCloudinary(tweetImageLocalPath)
    // console.log(tweetImage);

    const tweet = await Tweet.create(
        {
            content,
            tweetImage: tweetImage?.secure_url || "",
            tweetImageCloudinaryID: tweetImage?.public_id || "",
            owner: req.user._id
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweet,
                "tweet created successfully"
            )
        )
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!userId) throw new ApiError(400, "userID is required")

    const {page = 1, limit = 10} = req.query
    if (Number(page) === 0) {
        throw new ApiError(400, "page number should be at least 1 or higher")
    }

    const skip = (Number(page) - 1) * Number(limit);

    const userstweets = await Tweet.aggregate(
        [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: 'owner',
                    pipeline: [
                        {
                            $project: {
                                username : 1,
                                fullName : 1,
                                avatar : 1
                            }
                        }
                    ]
                }
            },
            {
                    $addFields: {
                    owner:{
                        $first : "$owner"
                    }
                }
            },
            {
                $skip: Number(skip)
            },
            {
                $limit: Number(limit)
            }
        ]
    )

    if (!userstweets) throw new ApiError(400, "error while fetching comments")

    // count total number of pages
    const totalDocumentsResult = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            },
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
                    userstweets,
                    totalPages
                },
                "tweets fetched successfully"
            )
        )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body
    if (!tweetId) throw new ApiError(400, "tweetId is required")
    if (!content) console.log("update content is not provided");

    let tweetImageLocalPath = req.file?.path
    if (!tweetImageLocalPath) console.log("tweet image is not provided");
    // console.log(tweetImageLocalPath);

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(400, "tweet not found")

    const owner = check_owner(tweet.owner, req.user._id)
    if (!owner) {
        throw new ApiError(400, "invalid request")
    } else {
        console.log("Owner verified");
    }

    // upload to cloudinary
    const tweetImage = await uploadOnCloudinary(tweetImageLocalPath)
    if (tweetImage && tweet.tweetImageCloudinaryID !== "") {
        deleteFromCloudinary(tweet.tweetImageCloudinaryID)
    }
    
    // update tweet
    tweet.content = content || tweet.content
    if (tweetImage) {
        tweet.tweetImage = tweetImage.secure_url
        tweet.tweetImageCloudinaryID = tweetImage.public_id
    }
    const updatedTweet = await tweet.save({ validateBeforeAve: false })
    if (!updatedTweet) throw new ApiError(500, "Error while updating tweet")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedTweet,
                "Tweet updated successfully"
            )
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!tweetId) throw new ApiError(400, "tweetId is required")

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) throw new ApiError(400, "tweet not found")

    const owner = check_owner(tweet.owner, req.user._id)
    if (!owner) {
        throw new ApiError(400, "invalid request")
    } else {
        console.log("Owner verified");
    }

    if (tweet.tweetImageCloudinaryID !== "") {
        await deleteFromCloudinary(tweet.tweetImageCloudinaryID)
        console.log("tweet image deleted from cloudinary");
    }

    const deletedTweet =  await Tweet.findByIdAndDelete(tweetId)
    if (!deletedTweet) throw new ApiError(500, "Error while deleting tweet from database")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "tweet deleted successfully"
            )
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}