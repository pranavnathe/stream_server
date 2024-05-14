import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

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

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body
    if (!(name && description)) {
        throw new ApiError(400, "Playlsit name and description are required")
    }

    const newPlaylist = await Playlist.create(
        {
            name,
            description,
            createdBy: await req.user._id
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newPlaylist,
                "new playlist created successfully"
            )
        )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //get user playlists
    const {userId} = req?.params
    if (!userId) throw new ApiError(400, "userId is required")

    const pipeline = [
        {
            $match: {
                createdBy: new mongoose.Types.ObjectId(userId) //ObjectId("_id"),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            views: 1,
                            createdAt: 1,
                            duration: 1,
                            owner: 1,
                        },
                    },
                    // {
                    //     $lookup: {
                    //         from: "users",
                    //         localField: "owner",
                    //         foreignField: "_id",
                    //         as: "owner",
                    //         pipeline: [
                    //             {
                    //                 $project: {
                    //                     username: 1,
                    //                     fullName: 1,
                    //                     avatar: 1,
                    //                     avatarCloudinaryID: 1,
                    //                 }
                    //             }
                    //         ]
                    //     }
                    // },
                    // {
                    //     $addFields: {
                    //         owner: {
                    //             $first: "$owner",
                    //         }
                    //     }
                    // }
                ]
            },
        },
        {
            $addFields: {
                videos: {
                    $first: "$videos",
                }
            }
        }
    ]

    const playlistData = await Playlist.aggregate(pipeline)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistData,
                "Playlist data fetched successfully"
            )
        )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    // get playlist by id
    const {playlistId} = req.params
    if (!playlistId) throw new ApiError(400, "playlsitId is required")

    // const playlistData = await Playlist.findById(playlistId)

    const pipeline = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId) //ObjectId("_id"),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            views: 1,
                            createdAt: 1,
                            duration: 1,
                            owner: 1,
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
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                        avatarCloudinaryID: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            }
        }
    ]

    const playlistData = await Playlist.aggregate(pipeline)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistData[0],
                "Playlist data fetched successfully"
            )
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!(playlistId && videoId)) {
        throw new ApiError(400, "playlistId and videoId are required")
    }

    const playlist = await Playlist.findById(playlistId)
    const owner = check_owner(playlist.createdBy, req.user._id)
    if (!owner) throw new ApiError(400, "invalid request")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push: {
                videos: videoId
            }
        },
        { new: true }
    )
    if (!updatedPlaylist) {
        throw new Error('Playlist not found');
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist data updated successfully"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // remove video from playlist
    const {playlistId, videoId} = req.params

    if (!(playlistId && videoId)) {
        throw new ApiError(400, "playlistId and videoId are required")
    }

    const playlist = await Playlist.findById(playlistId)
    const owner = check_owner(playlist.createdBy, req.user._id)
    if (!owner) throw new ApiError(400, "invalid request")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        { new: true }
    )
    if (!updatedPlaylist) {
        throw new Error('Playlist not found');
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist data updated successfully"
            )
        )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // delete playlist
    const {playlistId} = req.params
    if (!playlistId) throw new ApiError(400, "playlistId is required")
    
    try {
        await Playlist.findByIdAndDelete(playlistId)
    } catch (error) {
        console.log(error.message);
        throw new ApiError(500, "Error while deleting playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Playlist deleted successfully"
            )
        )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    // update playlist
    const {playlistId} = req.params
    const {name, description} = req.body
    if (!playlistId) throw new ApiError(400, "playlistId is required")
    if (!(name && description)) {
        console.log("name or description are not provided");
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) throw new ApiError(400, "Playlist not found")

    const owner = check_owner(playlist.createdBy, req.user._id)
    if (!owner) throw new ApiError(400, "invalid request")

    playlist.name = name || playlist.name
    playlist.description = description || playlist.description

    await playlist.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist data updated successfully"
            )
        )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}