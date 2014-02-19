
/*
 * GET home page.
 */
var http = require("http");
var cheerio = require("cheerio");
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');//用于拼接BUffer。防止中文单词断裂
var process = require('child_process');


// Utility function that downloads a URL and invokes
// callback with the data.
function download(url, callback) {
  http.get(url, function(res) {
    var bufferHelper = new BufferHelper();
    res.on('data', function (chunk) {
      	bufferHelper.concat(chunk);
    });
    res.on("end", function() {
    	var data = iconv.decode(bufferHelper.toBuffer(), 'GBK');
      	callback(data);
    });
  }).on("error", function() {
    callback(null);
  });
}

function sendMail(title, content){
	content = content.replace(/"/g,"\\\"");
	var str = 'echo "' + content + '"|mail -s "' + title + '" yangfang@fudan.edu.cn';
	process.exec(str);
}

exports.index = function(req, res){
  res.render('index', { title: 'TiebaSniffer' });
};

exports.start = function(req, res){
	var url = "http://tieba.baidu.com/f?kw=%C3%A7%BB%C4%BC%CD";
	download(url, function(data) {
	  if (data) {
	    var $ = cheerio.load(data);
	    console.log("ok"+$("ul#thread_list img[src*='zding.gif']").length);
	    $("ul#thread_list img[src*='zding.gif']").each(function(i, img) {
	    	var $link = $(img).parent().parent().find("a[href^='/p/']").first();
	    	var title = $link.text();
	        if(i===0){
            	console.log(title);
	        }

	        var temp_url = "http://tieba.baidu.com"+$link.attr("href");
	        download(temp_url,function(data){
	        	var $ = cheerio.load(data);

	        	//$("a").remove();
	        	$("a").each(function(i, e){
	        		var text = $(e).text();
	        		$(e).replaceWith(text);
	        	});

	        	var $contentDiv = $("div#j_p_postlist > div").first().find("div[id^=post_content]").first();
	        	//$contentDiv.find("a").remove();
	        	//$contentDiv.remove("a");
	        	var content = $('div','<div></div>').append($contentDiv).html();

		        if(i===1){
	            	console.log(content);
		        	res.send(title + "<br />" + content); 
		        }
	        	sendMail(title,content);
	        });
			// Document temp_doc = Jsoup.connect(temp_url).get();
			// Element contentDiv = temp_doc.select("div#j_p_postlist>div").first().select("div[id^=post_content]").first();
			// contentDiv.select("a").remove();
			// String content = contentDiv.outerHtml();
			
			
	      });

	    console.log("done");
	  }
	  else console.log("error");  
	});
};

exports.stop = function(req, res){

};