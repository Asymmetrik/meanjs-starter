# Novo - Self-refreshing Object Cache #

## Dependencies ##
1. MongoDB (http://mongodb.org)
1. Node.js (http://nodejs.org)
1. Gulp.js (http://gulpjs.com)
1. Bower.js (http://bower.io)
1. Bunyan.js (https://github.com/trentm/node-bunyan)

## Overview ##


## Organization ##
At the top-level are various configuration files including those for jshint (.jshintrc), csslint (.csslintrc), bower (.bowerrc), and karma. Also, the two project dependency files bower.json and package.json which manage dependencies for the client and server javascript respectively. The primary build configuration is contained in gulpfile.js. The server.js file is the main entry point for the node application.

### /config - All of the application config and boostrapping code. ###

/config/assets
Contains asset configuration files that are used to configure what assets are loaded for each deployment mode [production vs development]. As an example, the 'production' asset configuration references all of the minified libraries as well as the minified appliction code while the 'development' asset configuration references all of the unminified assets. All named configurations extend the 'default' configuration. The asset configuration that is used is determined by the 'deploymentMode' property that is set in the environment configuration.

/config/env
Contains environment configuration files that are used to set of environment-specific configuration for the application. The environment is set using the NODE_ENV environment variable and defaults to 'development'. This configuration is distinct from the asset configuration because you may have several development or production environments that share the same asset configuration.

/config/lib
Configuration for various libraries (express, mongoose, passport, etc). Most of these are loaded using requirejs from the ./server.js file.

/config/strategies
Strategy configurations for passport


### /app - Application Modules ###
The actual application code is organized into modules within this directory. Inside of each module is all of the server, client, and test code for that module. There is one 'special' modules called 'core'. This module contains some extra stuff that is core to the functionality of the application, including the AngularJS inapp initialization code contained under ./app/core/client/app.

### /node_modules ###
This directory houses all of the node dependencies. After you do 'npm install', this directory will be populated.

### /public - public artifacts ###

/public/lib
This directory contains all of the bower dependencies. They are commited to git. The procedure for updating these is to use bower and then commit the updates to the bower.json file and this directory.

/public/dist
Contains the built web application artifacts. These artifacts are generated by the 'gulp build' command and by convention they are committed to git.

## Installation ##
1. Checkout from Git
1. Run 'npm install' from the project directory
1. Install bunyan globally ('npm install -g bunyan')

## Configuration ##
You will want to make your own configuration file for the application. There are example development and production config files located under /config/env/ The best approach is to copy the development.js file and rename it to something else.

Once you've got your custom config file, you can update paths and other settings in that file (you can add the file to the .gitignore so you won't accidentally commit it).


## Running the Application ##
Set the NODE_ENV environment variable to have the value equal to the name of your config file (eg. if I named my config file 'reblace.js' I would make NODE_ENV=reblace). You can set env variables in linux using 'export NODE_ENV=value'.

Run 'gulp debug | bunyan' from the project directory to start the Node.js server. The gulp debug task runs nodemon to monitor the directory system for changes and it will rebuild/deploy the application automatically as changes are made. Piping to the bunyan cli will serialize your log output to human-readable form.

## Debugging ##
There are several options for debugging the server application. You can use an IDE like WebStorm, or you can use [node-inspector](https://github.com/node-inspector/node-inspector) to use the Chrome developer tools to debug the application.

The gulp debug task will launch node inspector, which will run a server you can hit to debug the server javascript code using the browser. The location is http://localhost:{node-inspector-port}/debug?port={debug-port}. These ports can be found in the default environment config file and modified in your custom config file.
