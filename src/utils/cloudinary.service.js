import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath, fileName, type) => {
    try {
        if (!localFilePath) {
            console.log(`Local File Path not found while uploading to cloudinary :: ${fileName}`);
            return null
        }

        // upload to cloudinary
        const response = await cloudinary.uploader
        .upload(localFilePath, {
            resource_type: "auto",
            secure: true // Ensure HTTPS URLs
        })
        // file has been uploaded successfully
        // console.log("file has been uploaded successfully on cloudinary \n ", response.url);
        // console.log(`cloudinary response \n`, response);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove local temp file from server
        console.log("file has been removed from local server due to failure of upload operation");
        return null
    }
}

const deleteFromCloudinary = async (cloudinaryFileID, videoID) => {
    try {
        //delete from cloudinary
        let response 
        if (cloudinaryFileID) {
            if (!cloudinaryFileID) {
                console.log(`Image public ID is required to delete from cloudinary`);
                return null
            };
            response = await cloudinary.uploader
                .destroy( cloudinaryFileID )
                .then(result => result)
        } else {
            if (!videoID) {
                console.log(`Video public ID is required to delete from cloudinary`);
                return null
            }
            response = await cloudinary.uploader
            .destroy( videoID , {
                resource_type: 'video'
            })
            .then(result => result)
        }
        // file has been deleted successfully
        // console.log(response);
        return response
    } catch (error) {
        console.log(`Error while deleting file from cloudinary :: File-ID :: ${cloudinaryFileID} \n`, error)
        return null
    }
}

// deleteFromCloudinary("76f4e7ab4c5c8e71441f54e40af57c4f")
export { uploadOnCloudinary, deleteFromCloudinary }