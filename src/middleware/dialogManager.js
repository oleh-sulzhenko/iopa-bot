/*
 * Iopa Bot Framework
 * Copyright (c) 2016 Internet of Protocols Alliance 
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Skill = require('../schema/skill');

const iopa = require('iopa'),
  constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER, 
  BOT = require('../constants').BOT;

function Dialog(app) { 

   var dialogs = {};
   this.dialogs = dialogs;
   this.app = app;

    app.dialog = function() {
           var args = [].splice.call(arguments,0);
            dialogName = args[0];

           if (!(typeof dialogName === 'string' || dialogName instanceof String))
                throw new Error("dialog must start with dialog name, then array of intents, then function to call"); 

            args.splice(0, 1);  // keep remainder
            
      
            dialogs[dialogName] = { 
                "name": dialogName,
                "steps": args
            }
    }

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Dialog] = {
        beginDialog: function(name, context, next) {

            var dialog = dialogs[name];

            if (!dialog)
              throw new Error("Dialog not recognized");
            
            dialogFunc = dialog.steps[0];

            if (typeof dialogFunc != "function") {
                dialogFunc = dialog.steps[1];
                context[BOT.Session][BOT.CurrentDialog] = { name: dialog.name, step: 2 }
            } else {
                context[BOT.Session][BOT.CurrentDialog] = { name: dialog.name, step: 1 }
            }

            return dialogFunc(context, next);
        }
    }
    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Dialog][IOPA.Version] = BOT.Version;

}

module.exports = Dialog;

Dialog.prototype.invoke = function (context, next) {
   
    if (!context[BOT.Intent])
      return next();
      // must have an intent to process dialog

    if (!context[BOT.Session][BOT.CurrentDialog]) 
         return this._matchBeginDialog(context, next);

    return this._continueDialog(context, next);

}

Dialog.prototype._matchBeginDialog = function (context, next) {

    var dialogFunc = null;

    for (var key in this.dialogs) {
        var dialog = this.dialogs[key];

        if (typeof dialog.steps[0] != "function") {
            if (dialog.steps[0].includes(context[BOT.Intent]) || dialog.steps[0].includes('*')) {
                dialogFunc = dialog.steps[1];
                context[BOT.Session][BOT.CurrentDialog] = { name: dialog.name, step: 2 };
                break;
            }
        }
    }

    if (dialogFunc)
        return dialogFunc(context, next);
    else
        return next();

}

Dialog.prototype._continueDialog = function (context, next) {
   
    var sessionDialog = context[BOT.Session][BOT.CurrentDialog];

    var dialog = this.dialogs[sessionDialog.name];

     if (sessionDialog.step >= dialog.steps.length)
        {
            // was at end of dialog so just clear
            context[BOT.Session][BOT.CurrentDialog] = null;
           return this._matchBeginDialog(context, next);
        }
    
    var intentFilter;
    var dialogFunc;

    var intentFilter = dialog.steps[sessionDialog.step];

    if (typeof intentFilter == "function") {
        dialogFunc = intentFilter;
        intentFilter = null;
    } else {
        sessionDialog.step ++;
        dialogFunc = dialog.steps[sessionDialog.step];
    }

    sessionDialog.step ++;

    if (intentFilter && !intentFilter.includes(context[BOT.Intent]) && !intentFilter.includes('*')) {
        context[BOT.Session][BOT.CurrentDialog] = null;
        return this._matchBeginDialog(context, next);
    }

    return dialogFunc(context, function(){ return Promise.resolve(null) });

}

// ES6 Array Polyfill

if (!Array.prototype.includes) {

    Object.defineProperty(Array.prototype, "includes", {
        enumerable: false,
        value: function (searchElement) {
            'use strict';
            if (this == null) {
                throw new TypeError('Array.prototype.includes called on null or undefined');
            }

            var O = Object(this);
            var len = parseInt(O.length, 10) || 0;
            if (len === 0) {
                return false;
            }
            var n = parseInt(arguments[1], 10) || 0;
            var k;
            if (n >= 0) {
                k = n;
            } else {
                k = len + n;
                if (k < 0) { k = 0; }
            }
            var currentElement;
            while (k < len) {
                currentElement = O[k];
                if (searchElement === currentElement ||
                    (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                    return true;
                }
                k++;
            }
            return false;
        }
    });
}
