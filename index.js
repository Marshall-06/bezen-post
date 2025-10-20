const express = require("express")
require("dotenv").config();
PORT = process.env.PORT
const sequelize = require("./config/db")
const tiktokRouter = ("./routes/tiktokPost")

const app = express()
app.use(express.json())

app.use("/api/tiktok", require("./routes/tiktokPost"));
app.use("/api/instagram", require("./routes/instagramPost"));



app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}`)
})