var nforce = require('nforce');

var userName = process.env.INTEGRATION_USER_NAME,
    password = process.env.INTEGRATION_USER_PASSWORD,
    connectedAppId = process.env.CONNECTED_APP_ID,
    connectedAppSecret = process.env.CONNECTED_APP_SECRET;

org = nforce.createConnection({
    clientId: connectedAppId,
    clientSecret: connectedAppSecret,
    redirectUri: "http://localhost:5000",
    environment: 'production',
    mode: 'single',
    autoRefresh: true
});

org.authenticate({ username: userName, password: password}, function(err, resp) {
    if (err) {
        console.log('nforce connection failed: ' + err.message);
    } else {
        console.log('nforce connection succeeded');
    }
});

function getContact(req, res, next) {
    org.query({ query: 'SELECT id, firstname, lastname, Picture_URL__C FROM contact WHERE game_contact__c=true' },
        function(err, result){
            if(err) {
                throw err;
            } else {
                if (result.totalSize < 1) {
                    res.send({"error": "no contact found"});
                } else {
                    var contact = result.records[0];
                    res.send({id: contact.get("Id"), firstName: contact.get("FirstName"), lastName: contact.get("LastName"), pictureURL: contact.get("Picture_URL__c")});
                }

            }
        });
};

function getGame(req, res, next) {
    org.query({ query: 'SELECT name, logo__c FROM game__c' },
        function(err, result){
            if(err) {
                throw err;
            } else {
                if (result.totalSize < 1) {
                    res.send({"error": "no contact found"});
                } else {
                    var game = result.records[0];
                    res.send({name: game.get("Name"), logo: game.get("Logo__c")});
                }

            }
        });
};

function prettyQuestions(sfQuestions) {
    console.log(JSON.stringify(sfQuestions));
    var questions = [];
    for (var i=0; i < sfQuestions.length; i++) {
        var sfQuestion = sfQuestions[i];
        var sfAnswers = sfQuestion.get("game_answers__r");
        if (sfAnswers && sfAnswers.records) {
            var answers = [];
            for (var j = 0; j < sfAnswers.records.length; j++) {
                var sfAnswer = sfAnswers.records[j];
                answers.push({
                    sfid: sfAnswer.Id,
                    text: sfAnswer.Answer_Text__c,
                    correct_answer: sfAnswer.Correct_Answer__c
                });
            }
        }
        var sfPictures = sfQuestion.get("game_pictures__r");
        if (sfPictures && sfPictures.records) {
            var pictures = [];
            for (var h = 0; h < sfPictures.records.length; h++) {
                var sfPicture = sfPictures.records[h];
                pictures.push({
                    sfid: sfPicture.Id,
                    url: sfPicture.Picture_URL__c,
                    caption: sfPicture.Caption__c
                });
            }
        }
        questions.push({sfid: sfQuestion.get("Id"), text: sfQuestion.get("Question_Text__c"), title: sfQuestion.get("Title__c"), type: sfQuestion.get("Type__c"), step: sfQuestion.get("Step__c") == null ? 0 : sfQuestion.get("Step__c"), videoURL: sfQuestion.get("Video_URL__c"), answers: answers, pictures: pictures});
    }
    return questions;
}

function getQuestions(req, res, next) {

    org.query({ query: 'SELECT id, question_text__c, title__c, type__c, step__c, video_url__c, (SELECT id, answer_text__c, correct_answer__c FROM game_answers__r ORDER BY sequence__c), (SELECT id, picture_url__c, caption__c FROM game_pictures__r ORDER BY sequence__c) FROM game_question__c ORDER BY step__c' },
        function(err, result){
            if (err) {
                throw err;
            } else {
                if (result.totalSize < 0) {
                    res.send({"error": "no question found"})
                }
                res.send(prettyQuestions(result.records));
            }
        });

};

function getQuestionByStepNumber(req, res, next) {
    var step = req.params.step;

    org.query({ query: 'SELECT id, question_text__c, title__c, type__c, step__c, video_url__c, (SELECT id, answer_text__c, correct_answer__c FROM game_answers__r ORDER BY sequence__c) answers, (SELECT id, picture_url__c, caption__c FROM game_pictures__r ORDER BY sequence__c) pictures FROM game_question__c WHERE step__c=' + step },
        function(err, result){
            if(err) {
                throw err;
            } else {
                if (result.totalSize < 1) {
                    res.send({"error": "Question " + step + " not defined"});
                    return;
                }
                res.send(prettyQuestions(result.records)[0]);
            }
        });

};

function submitResponse(req, res, next) {
    var body = req.body;
    console.log(body);

    org.query({ query: "SELECT id FROM game_contact_answer__c WHERE game_question__c='" + body.questionSfid  + "' AND contact__c='" + body.contactId + "'"},
        function(err, result) {
            if (err) {
                res.send("error");
                return;
            }
            // Delete all existing answers for that question for a specific patient (should only be one) -- don't wait
            console.log('deleting ' + result.totalSize + ' answers');
            for (var i=0; i<result.totalSize; i++) {
                org.delete({sobject: result.records[i]});
            }
            // Create new answer
            var answer = nforce.createSObject('game_contact_answer__c');
            answer.set('contact__c', body.contactId);
            answer.set('game_question__c', body.questionSfid);
            answer.set('game_answer__c', body.answerSfid);
            org.insert({sobject: answer}, function (err, resp) {
                if (err) {
                    res.send("error");
                    return;
                }
                console.log('new answer inserted');
                res.send("ok");
            });
        });

}

function changeContactStatus(req, res, next) {

    console.log('changeStatus');
    console.log(req.body);

    var body = req.body,
        contact = nforce.createSObject('contact');

    contact.set('Id', body.contactId);
    contact.set('Game_Status__c', body.status);
    org.update({sobject: contact}, function (err, resp) {
        if (err) {
            res.send("error");
        } else {
            res.send("ok");
        }
    });
}

function authenticate(req, res) {
    res.redirect(org.getAuthUri());
}

exports.authenticate = authenticate;
exports.getGame = getGame;
exports.getContact = getContact;
exports.getQuestionByStepNumber = getQuestionByStepNumber;
exports.getQuestions = getQuestions;
exports.submitResponse = submitResponse;
exports.changeContactStatus = changeContactStatus;