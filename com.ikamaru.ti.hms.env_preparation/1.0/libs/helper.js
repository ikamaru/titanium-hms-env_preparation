
var fs = require('fs');
var path = require("path");


const TARGET = path.join("build", "android", "build.gradle");
const CLASSPATH="classpath 'com.huawei.agconnect:agcp:1.4.1.300'";
const MAVEN_REPO="maven {url 'https://developer.huawei.com/repo/'}"
const ANDROID_DIR = 'build/android';
const PLATFORM = {
    ANDROID: {
     	dest: [
            ANDROID_DIR + '/app/agconnect-services.json'
        ],
        src: [
        	'platform/android/agconnect-services.json'
        ],
    }
};

/***JSON moving helper***/
function fileExists(path) {
    try {
    	return fs.statSync(path).isFile();
    } catch (e) {
      	return false;
    }
}

/***Maven and classpath helper***/


function rootBuildGradleExists() {
  	return fs.existsSync(TARGET);
}
/*
 * Helper function to read the build.gradle that sits at the root of the project
 */
function readRootBuildGradle() {
  	return fs.readFileSync(TARGET, "utf-8");
}

/*
 * Helper function to write to the build.gradle that sits at the root of the project
 */
function writeRootBuildGradle(contents) {
	fs.writeFileSync(TARGET, contents);
}

/*
 * Added a dependency on "classpath 'com.huawei.agconnect:agcp:1.4.1.300'"  based on the position of the know 'com.android.tools.build' dependency in the build.gradle
 */
function addDependencies(buildGradle) {
  	// find the known line to match
  	var match = buildGradle.match(/^(\s*)classpath 'com.android.tools.build(.*)/m);
  	var whitespace = match[1];
  
  	// modify the line to add the necessary dependencies
  	var agcDependency = whitespace + CLASSPATH 

  	var modifiedLine = match[0] + '\n' + agcDependency;
  
  	// modify the actual line
  	return buildGradle.replace(/^(\s*)classpath 'com.android.tools.build(.*)/m, modifiedLine);
}

/*
 * Add "maven { url 'http://developer.huawei.com/repo/'" and Crashlytics to the repository repo list
 */
function addRepos(buildGradle) {
	// find the known line to match
  	var match = buildGradle.match(/^(\s*)jcenter\(\)/m);
  	var whitespace = match[1];

  	// modify the line to add the necessary repo
  	var huaweiMavenRepo = whitespace + MAVEN_REPO
  	var modifiedLine = match[0] + '\n' + huaweiMavenRepo;

  	// modify the actual line
  	buildGradle = buildGradle.replace(/^(\s*)jcenter\(\)/m, modifiedLine);

  	// update the all projects grouping
  	var allProjectsIndex = buildGradle.indexOf('allprojects');
  	if (allProjectsIndex > 0) {
	    // split the string on allprojects because jcenter is in both groups and we need to modify the 2nd instance
	    var firstHalfOfFile = buildGradle.substring(0, allProjectsIndex);
	    var secondHalfOfFile = buildGradle.substring(allProjectsIndex);

	    // Add google() to the allprojects section of the string
	    match = secondHalfOfFile.match(/^(\s*)jcenter\(\)/m);
	    var huaweiMavenRepo = whitespace + MAVEN_REPO
	    modifiedLine = match[0] + '\n' + huaweiMavenRepo;
	    // modify the part of the string that is after 'allprojects'
	    secondHalfOfFile = secondHalfOfFile.replace(/^(\s*)jcenter\(\)/m, modifiedLine);

	    // recombine the modified line
	    buildGradle = firstHalfOfFile + secondHalfOfFile;
  	} else {
	    // this should not happen, but if it does, we should try to add the dependency to the buildscript
	    match = buildGradle.match(/^(\s*)jcenter\(\)/m);
	    var huaweiMavenRepo = whitespace + MAVEN_REPO
	    modifiedLine = match[0] + '\n' + huaweiMavenRepo;
	    // modify the part of the string that is after 'allprojects'
	    buildGradle = buildGradle.replace(/^(\s*)jcenter\(\)/m, modifiedLine);
  	}

  	return buildGradle;
}

function hmsDependeciesExists(buildGradle){
	
    if(buildGradle.includes(CLASSPATH) )
        return true;
    return false;

}


module.exports = {
	copyJsonFile: function() {
		var platform= PLATFORM.ANDROID; 
	    for (var i = 0; i < platform.src.length; i++) {
	      var file = platform.src[i];
	      if (fileExists(file)) {
	        try {
	          var contents = fs.readFileSync(file).toString();

	          try {
	            platform.dest.forEach(function (destinationPath) {
	              var folder = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
	              //fs.ensureDirSync(folder);
	              fs.writeFileSync(destinationPath, contents);
	            });
	          } catch (e) {
	            // skip
	            console.error("error: "+e);
	          }
	        } catch (err) {
	          console.log(err);
	        }

	        break;
	      }else{
	      	console.log("[WARNING]	"+file+" NOT FOUND, !!please make sure of  this file availability!!");
	      }
	    }
	},
	modifyRootBuildGradle:function() {
	    // be defensive and don't crash if the file doesn't exist
	    if (!rootBuildGradleExists) {
	      return;
	    }

	    var buildGradle = readRootBuildGradle();
	    //if HMS depencies already exists no need to add it 
	    if(hmsDependeciesExists(buildGradle)) return;

	    // Add AG Services Dependency
	    buildGradle = addDependencies(buildGradle);
	  
	    // Add huawei's Maven Repo
	    buildGradle = addRepos(buildGradle);

	    writeRootBuildGradle(buildGradle);
	  }
};