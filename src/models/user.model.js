import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true
        },
        avatarCloudinaryID: {
            type: String, // cloudinary public_id
            required: true
        },
        coverImage: {
            type: String // cloudinary url
        },
        coverImageCloudinaryID: {
            type: String // cloudinary public_id
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.addToWatchHistory  = async function(videoId) {
    if (this.watchHistory.includes(videoId)) {
        const errorMessage = "Video is already added to watch history"
        // console.error("Error in addToWatchHistory ::", errorMessage)
        return errorMessage
    } else {
        this.watchHistory.push(videoId)
        await this.save({ validateBeforeSave: false })
        const successMessage = "Video added to the watch history."
        return successMessage
    }
}

userSchema.methods.removeFromWatchHistory  = async function(videoId) {
    const index = this.watchHistory.indexOf(videoId)
    if (index !== -1) {
        this.watchHistory.splice(index, 1)
        await this.save({ validateBeforeSave: false })
        const successMessage = "Video removed from the watch history."
        return successMessage
    } else {
        const errorMessage = "This video is not in the watch history."
        console.error("Error in removeFromWatchHistory ::", errorMessage)
        return errorMessage
    }
}

export const User = mongoose.model("User", userSchema)