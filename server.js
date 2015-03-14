var express = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    compression = require('compression'),
    path = require('path'),
    cors = require('cors'),
    salesforce = require('./routes/salesforce'),
    app = express();

app.set('port', process.env.PORT || 5000);

app.use(compression());
app.use(methodOverride());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(path.join(__dirname, './www')));
app.use("/install", express.static(path.join(__dirname, './install')));

app.use(function(err, req, res, next) {
    console.log(err.stack);
    res.send(500, err.message);
});

app.use(cors());

app.post('/responses', salesforce.submitResponse);
app.get('/questions', salesforce.getQuestions);
app.get('/questions/:step', salesforce.getQuestionByStepNumber);
app.get('/game', salesforce.getGame);
app.get('/contacts/me', salesforce.getContact);
app.put('/status', salesforce.changeContactStatus);

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});