// simple http server
var sys = require("sys"),
    http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs");

http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), uri);
    path.exists(filename, function(exists) {
    	if(!exists) {
    		response.sendHeader(404, {"Content-Type": "text/plain"});
    		response.write("404 Not Found\n");
    		response.close();
    		return;
    	}

    	fs.readFile(filename, "binary", function(err, file) {
    		if(err) {
    			response.sendHeader(500, {"Content-Type": "text/plain"});
    			response.write(err + "\n");
    			response.close();
    			return;
    		}

    		response.sendHeader(200);
    		response.write(file, "binary");
    		response.close();
    	});
    });
}).listen(8080);
sys.puts("Server running at http://localhost:8080/");
