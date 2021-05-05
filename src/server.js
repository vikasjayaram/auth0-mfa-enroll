const express = require("express");
const { join } = require("path");
const app = express();

app.use(express.static(__dirname));
app.get("/*", (_, res) => {
    res.sendFile(join(__dirname, "index.html"));
});
app.listen(8080, () => console.log("MFA Companion Application running on port 8080"));