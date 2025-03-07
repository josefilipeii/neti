#!/bin/zsh

PROJECT_ID="$1"
ODIN_APP_NAME="odin-$PROJECT_ID"
HEIMDALL_APP_NAME="heimdall-$PROJECT_ID"
SELF_APP_NAME="self-$PROJECT_ID"



firebase apps:create WEB $ODIN_APP_NAME --project $PROJECT_ID
firebase hosting:sites:create $ODIN_APP_NAME --project $PROJECT_ID
firebase target:apply hosting $ODIN_APP_NAME $ODIN_APP_NAME --project $PROJECT_ID


firebase apps:create WEB $HEIMDALL_APP_NAME --project $PROJECT_ID
firebase hosting:sites:create $HEIMDALL_APP_NAME --project $PROJECT_ID
firebase target:apply hosting $HEIMDALL_APP_NAME $HEIMDALL_APP_NAME --project $PROJECT_ID

firebase apps:create WEB $SELF_APP_NAME --project $PROJECT_ID
firebase hosting:sites:create $SELF_APP_NAME --project $PROJECT_ID
firebase target:apply hosting $SELF_APP_NAME $SELF_APP_NAME --project $PROJECT_ID