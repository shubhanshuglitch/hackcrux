@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements. See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership. The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License. You may obtain a copy of the License at
@REM
@REM https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied. See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET __MVNW_ARG0_NAME__=%~nx0)
@SET __MVNW_CMD__=
@SET __MVNW_ERROR__=
@SET __MVNW_SAVE_ERRORLEVEL__=
@SET __MVNW_SAVE_CD__=%CD%

@setlocal

@SET MAVEN_PROJECTBASEDIR=%__MVNW_SAVE_CD__%
@FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
    @IF "%%A"=="distributionUrl" SET MVNW_DISTRIBUTION_URL=%%B
)

@SET MAVEN_USER_HOME=%USERPROFILE%\.m2
@SET MVN_CMD=%MAVEN_USER_HOME%\wrapper\dists

@IF NOT EXIST "%MAVEN_USER_HOME%\wrapper" MKDIR "%MAVEN_USER_HOME%\wrapper"
@IF NOT EXIST "%MVN_CMD%\dists" MKDIR "%MVN_CMD%\dists"

@SET MVNW_JAR_PATH=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar

@IF NOT EXIST "%MVNW_JAR_PATH%" (
    @ECHO Downloading Maven Wrapper JAR...
    @powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile '%MVNW_JAR_PATH%'"
)

@SET JAVA_HOME_CANDIDATE=%JAVA_HOME%
@IF "%JAVA_HOME_CANDIDATE%"=="" (
    @FOR /F "usebackq tokens=*" %%F IN (`where java 2^>nul`) DO (
        @SET JAVA_HOME_CANDIDATE=%%~dpF..
        @GOTO :found_java
    )
)
:found_java

@SET MVNW_VERBOSE=false
@IF NOT "%MVNW_VERBOSE%"=="" SET MVNW_VERBOSE_FLAG=-Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%"

@"%JAVA_HOME_CANDIDATE%\bin\java.exe" ^
  -classpath "%MVNW_JAR_PATH%" ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  "-Dmaven.wrapper.propertiesFile=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties" ^
  org.apache.maven.wrapper.MavenWrapperMain %*

@SET MVNW_ERRORLEVEL=%ERRORLEVEL%
@endlocal
@EXIT /B %MVNW_ERRORLEVEL%
