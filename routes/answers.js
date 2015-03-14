var db = require('./pghelper');

function submit(req, res, next) {
    console.log("submit");
    var answer = req.body;
    console.log(answer);

    var patientId = "003j0000007wBeAAAU";

    // delete existing answer
    db.query('DELETE FROM salesforce.game_patient_answer__c WHERE contact__c=$1 AND game_question__c=$2', [patientId, answer.questionSfid])
        .then(function (result) {
            console.log(result);
            // insert new answer
            db.query('INSERT INTO salesforce.game_patient_answer__c (contact__c, game_question__c, game_answer__c) VALUES ($1, $2, $3)', [patientId, answer.questionSfid, answer.answerSfid])
                .then(function () {
                    res.send('ok');
                })
                .catch(next);
        })
        .catch(next);
}

exports.submit = submit;
