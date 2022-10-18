const express = require('express')
const app = express()
const port = 3000

    app.use(function(req, res, next) {
        res.set("Cross-Origin-Embedder-Policy", "require-corp");
        res.set("Cross-Origin-Opener-Policy", "same-origin");
        return next();
    });
    app.use(express.static('Files'));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

