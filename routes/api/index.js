var express = require('express');
var router = express.Router();

router.use('/currencies', require('./currencies'));

module.exports = router;