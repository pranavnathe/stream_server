import { Router } from "express";
import { 
    LogoutUser, 
    changeCurrentPassword, 
    checkUsername, 
    getCurrentUser, 
    getUserChannelProfile, 
    getUserWatchHistory, 
    loginUser, 
    refreshAccessToken, 
    registerUser, 
    removeFromWatchHistory, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

// secure route
router.route("/logout").post(verifyJWT, LogoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/check-username").post(checkUsername)

router.route("/update-avatar")
    .patch(
        verifyJWT, 
        upload.single("avatar"),
        updateUserAvatar
    )
router.route("/update-cover")
    .patch(
        verifyJWT, 
        upload.single("coverImage"),
        updateUserCoverImage
    )

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getUserWatchHistory)
router.route("/delete-history/:videoId").patch(verifyJWT, removeFromWatchHistory)

export default router