#!/bin/bash

PROJECT_NAME=sud-core-api
PROJECT_VER=1.0

RESULT_FILE=${PROJECT_NAME}-${PROJECT_VER}
TEMP_FILE=${PROJECT_NAME}-${PROJECT_VER}-${BUILD_NUMBER}

echo "=========================="
echo "Updating rulepacks"
fortifyupdate

echo "=========================="
echo "Cleaning"
sourceanalyzer -clean

echo "=========================="
echo "Scanning"
sourceanalyzer -scan -f $TEMP_FILE.fpr -Xmx5529M -Xms400M -Xss24M ./app/*

echo "=========================="
echo "Merging"
EXISTING_FPR_FILE=$(find ./fortify -name "*.fpr")
if [ -z "${EXISTING_FPR_FILE}" ]; then
    echo "No existing scan found. No merging performed."
    mv $TEMP_FILE.fpr $RESULT_FILE.fpr
else
    echo "Merging existing fortify file $EXISTING_FPR_FILE into new scan."
    FPRUtility -merge -project $EXISTING_FPR_FILE -source $TEMP_FILE.fpr -f $RESULT_FILE.fpr
    rm $TEMP_FILE.fpr
fi

echo "=========================="
echo "Generating reports $RESULT_FILE"
ReportGenerator -user builduser -template Security_Report.xml -format pdf -f $RESULT_FILE.pdf -source $RESULT_FILE.fpr || true;
