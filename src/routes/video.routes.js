import { Router } from "express";
import { 
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishVideo,
    togglePublishStatus,
    updateVideo,
    updateVideoViewCount
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
// router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/")
    .get(getAllVideos)
    .post(
        verifyJWT,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]),
        publishVideo
    )

router
    .route("/:videoId")
    .patch(
        verifyJWT,
        upload.single("thumbnail"), 
        updateVideo
    )
    .delete(verifyJWT, deleteVideo)

router
    .route("/watch/:videoId")
    .get(verifyJWT, getVideoById)
    .patch(updateVideoViewCount)

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus)
// router.route("/results").get(getAllVideos)

export default router