import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"

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

const getVideoComments = asyncHandler(async (req, res) => {
    //get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!videoId) {
        throw new ApiError(400, "videoId is required")
    }

    if (Number(page) === 0) {
        throw new ApiError(400, "page number should be at least 1 or higher")
    }

    const skip = (Number(page) - 1) * Number(limit);

    const comments =await Comment.aggregate(
        [
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
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
                                username : 1,
                                fullName : 1,
                                avatar : 1
                            }
                        }
                    ]
                },
            },
            {
                $addFields: {
                    owner: {
                        $first: "$owner",
                    },
                },
            },
            {
                $skip: Number(skip)
            },
            {
                $limit: Number(limit)
            }
        ]
    )
    if (!comments) throw new ApiError(400, "error while fetching comments")

    // count total number of pages
    const totalDocumentsResult = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
                    comments,
                    totalPages
                },
                "all comments fetched successfully"
            )
        )
})

const addComment = asyncHandler(async (req, res) => {
    //add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    console.log(` content: ${content} \n videoId: ${videoId}`)
    if (!(content && videoId)) {
        throw new ApiError(400, "All feild are required")
    }
    
    const videoData = await Video.findById(videoId)
    if (!videoData) {
        throw new ApiError(400, "Video not found :: please check provided videoId")
    }
    // console.log(videoData);

    const comment = await Comment.create(
        {
            content: content,
            video: videoData._id,
            owner: req.user._id,
        }
    )

    const commentData = await Comment.findById(comment._id)
    if (!commentData) {
        throw new ApiError("Error while adding comment data")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                commentData,
                "Comment added successfully"
            )
        )

})

const updateComment = asyncHandler(async (req, res) => {
    //update a comment
    const {commentId} = req.params
    const {content} = req.body

    if (!commentId) throw new ApiError(400, "commentId is required")
    if (!content) throw new ApiError(400, "content is required")
    // console.log(commentId, content);

    const comment = await Comment.findById(commentId)
    if (!comment) throw new ApiError(400, "Invalid commentId")
    // console.log(comment);
    const owner = check_owner(comment.owner, req.user._id)
    if (!owner) throw new ApiError(400, "invalid request")
    // console.log(`is owner: ${owner}`)

    comment.content = content
    await comment.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comment,
                "comment updated successfully"
            )
        )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if (!commentId) throw new ApiError(400, "commentId is required")

    const comment = await Comment.findById(commentId)
    if (!comment) throw new ApiError(400, "Invalid commentId")
    // console.log(comment);

    const owner = check_owner(comment.owner, req.user._id)
    if (!owner) throw new ApiError(400, "invalid request")

    const deletedComment = await Comment.findByIdAndDelete(comment._id)
    if (!deletedComment) throw new ApiError(400, "Error while deleting comment")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "comment deleted successfully"
            )
        )

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}