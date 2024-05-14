import dotenv from "dotenv";
import connectDB from "./database/index.js";
import app from "./app.js"

dotenv.config({
    path: './.env'
})

const PORT = process.env.PORT || 8060;

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log(`Error while listening :: ${error}`);
    })
    app.listen( PORT, () => {
        console.log(`⚙️  Server is running at PORT :: ${PORT}`);
    })
})
.catch((error) => {
    console.log("Database connection failed : please make sure database is up and running properly :", error);
})