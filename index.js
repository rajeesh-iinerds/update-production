'use strict'

const jsonQuery = require('json-query');
var AWS = require('aws-sdk');

AWS.config.apiVersions = {
  cloudformation: '2010-05-15',
  lambda: '2015-03-31'
  // other service API versions
};

var cloudformation = new AWS.CloudFormation();
var codepipeline = new AWS.CodePipeline();
var lambda = new AWS.Lambda();

exports.handler = function(event, context, callback) {

    var jobId = event["CodePipeline.job"].id;
    //var stackName = event["CodePipeline.job"].data.inputArtifacts[0].name;

    //console.log(stackName);
    // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
    // health checked by this function.
    var stackParams = {
        StackName: 'MyBetaStack3',
        TemplateStage: 'Processed'
    };
    
    // var stackParams = {
    //     StackName: 'MyBetaStack3',
    //     TemplateStage: 'Processed'
    // };

    var restApiIdVal;

    var cfGetTemplate = function(message) {
        var cpParams = {
            jobId: jobId
        };
        codepipeline.putJobSuccessResult(cpParams, function(err, data) {
            if (err) {
                callback(err);
            }
            else {
                cloudformation.getTemplate(stackParams, function(err, data) {
                    if (err) { 
                        console.log(err, err.stack);
                    }
                    else {
                        //console.log(util.inspect(data, {depth: null}));
                        var templateBody = data.TemplateBody;
                        var jsonTemplate = JSON.parse(templateBody);
                        var functionName = jsonTemplate.Resources.CCTFunction.Properties.FunctionName;

                        var publishVersionParams = {
                            FunctionName: functionName, /* required */
                            Description: 'New Version'
                        };
                        lambda.publishVersion(publishVersionParams, function(err, data) {
                            if (err) console.log(err, err.stack); // an error occurred
                            else {
                                var version = data.Version;
                                var updateAliasParams = {
                                    FunctionName: functionName, /* required */
                                    Name: 'prod', /* required */
                                    FunctionVersion: version,
                                };
                                lambda.updateAlias(updateAliasParams, function(err, data) {
                                    if (err) console.log(err, err.stack); // an error occurred
                                    else     console.log(data);           // successful response
                                });
                            }             
                        });
                    } 
                });
                callback(null, message);
            }    
        });    
    }    
    cfGetTemplate('Success');
};