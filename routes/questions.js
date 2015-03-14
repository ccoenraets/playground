var db = require('./pghelper');

function getAll(req, res, next) {

    db.query('SELECT q.id, q.sfid, q.name as question, json_agg((a.name, a.sfid)) as answers FROM salesforce.game_question__c as q, salesforce.game_answer__c as a where a.game_question__c = q.sfid GROUP BY q.id, q.sfid, q.name')
        .then(function (questions) {
            return res.json(questions);
        })
        .catch(next);
};

function getById(req, res, next) {
    var step = req.params.step;
    db.query('SELECT id, sfid, name FROM salesforce.game_question__c WHERE step__c=$1', [step], true)
        .then(function (question) {
            console.log(question.sfid);
            db.query('SELECT id, sfid, name, correct_answer__c as correct_answer FROM salesforce.game_answer__c WHERE game_question__c=$1 ORDER BY sequence__c', [question.sfid], false)
                .then(function(answers) {
                    question.answers=answers;
                    return res.send(question);
                })
                .catch(next);
        })
        .catch(next);
};

exports.getAll = getAll;
exports.getById = getById;
