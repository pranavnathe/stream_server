import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.service.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Error while generating Access and Refresh Tokens")
    }
}

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    // domain: process.env.FRONTEND_DOMAIN
}

const registerUser = asyncHandler( async (req, res) => {
    
    const { fullName, email, username, password } = req.body
    // console.log("username:", username)

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUserwithUsername = await User.findOne({
        $or: [ {username} ]
    })
    if (existedUserwithUsername) {
        throw new ApiError(409, "Username is already taken")
    }

    const existedUserWithEmail = await User.findOne({
        $or: [ {email} ]
    })
    if (existedUserWithEmail) {
        throw new ApiError(409, "User already exists with this email")
    }

    // local file path
    let avatarLocalPath
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files?.avatar[0]?.path;
    } else {
        throw new ApiError(401, "Avatar file is missing")
    }

    //const coverImageLocalPath = req.files?.coverImage[0]?.path;  // ERROR
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required")
    }

    // Check if the email is a Gmail address
    const gmailRegex = /@gmail\.com$/;
    if (!gmailRegex.test(email.toLowerCase())) {
        throw new ApiError(400, "Enter valid Gmail address");
    }

    // upload image to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath, "Avatar")
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "Cover_Image")

    if (!avatar) {
        throw new ApiError(400, "Avatar image is required :: while uploading to cloudinar")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.secure_url,
        avatarCloudinaryID: avatar.public_id,
        coverImage: coverImage?.secure_url || "",
        coverImageCloudinaryID: coverImage?.public_id || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id)
    .select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Error while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler( async (req, res) => {
    const {email, username, password} = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "email is required")
    }

    // Check if the email is a Gmail address
    const gmailRegex = /@gmail\.com$/;
    if (!gmailRegex.test(email.toLowerCase())) {
        throw new ApiError(400, "Enter valid Gmail address");
    }

    if (!password) throw new ApiError(400, "invalid password")

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken");

    return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(200, {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
                )
            )
})

const LogoutUser = asyncHandler ( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 //this removes the field from document
            }
        },
        {
            new: true
        }
    )


    return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler ( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unAuthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Inavalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken},
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler ( async (req, res) => {
    const {oldPassword, newPassword} = req.body
console.log(req.user?._id);
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
            .json(
                new ApiResponse(200, {}, "Password change successfuly")
            )
})

const getCurrentUser = asyncHandler ( async (req, res) => {
    const user = await req.user
    if (!user) {
        throw new ApiError(400, "Error while fetching user details")
    } 
    // console.log(user);
    return res
            .status(200)
            .json(
                new ApiResponse (200,
                user,
                "Current user fetched successfully"
                )
            )
})

const updateAccountDetails = asyncHandler ( async (req, res) => {
    const {fullName, email} = req.body

    if (!(fullName || email)) {
        throw new ApiError(400, "Please fill at least one field")
    }

    const userData = await User.findById(req.user._id)

    if (fullName) {
        userData.fullName = fullName.trim()
    }

    if (email) {
        userData.email = email.trim()
    }

    await userData.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                userData, 
                "Account details are updated successfully"
            )
        )
})

const updateUserCoverImage = asyncHandler ( async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.secure_url) {
        throw new ApiError(400, "Error while uploading avatar")
    }
    await deleteFromCloudinary(req.user?.coverImageCloudinaryID)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.secure_url,
                coverImageCloudinaryID: coverImage.public_id
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200)
            .json(new ApiResponse(200, user, "Cover image is updated"))
})

const updateUserAvatar = asyncHandler ( async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }
    await deleteFromCloudinary(req.user?.avatarCloudinaryID)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.secure_url,
                avatarCloudinaryID: avatar.public_id
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200)
            .json(new ApiResponse(200, user, "Avatar is updated"))
})

const getUserChannelProfile = asyncHandler ( async (req, res ) => {
    const {username} = req.params
    // console.log(username);
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
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
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                // email: 1,
            }
        }
    ])
    // console.log(channel);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        )
})

const getUserWatchHistory = asyncHandler ( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})

const removeFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) throw new ApiError(401, "videoId is required")

    try {
        const user = await User.findById(req.user._id)
        user.removeFromWatchHistory(videoId)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "removed from watch history"
                )
            )

    } catch (error) {
        throw new ApiError(500, "Error in removefromWatchHistory")
    }
})

const checkUsername = asyncHandler( async (req, res) => {
    const { username } = req.body
    let usernameMatched = false

    const existedUserwithUsername = await User.findOne({
        $or: [ {username} ]
    })

    if (existedUserwithUsername) {
        usernameMatched = true
    } else {
        usernameMatched = false
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                200, 
                {usernameMatched}, 
                "Username fetched successfully"
            )
    )
})

export { 
    registerUser,
    loginUser,
    LogoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserCoverImage,
    updateUserAvatar,
    getUserChannelProfile,
    getUserWatchHistory,
    removeFromWatchHistory,
    checkUsername
}