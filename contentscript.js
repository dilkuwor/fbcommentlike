
//Initialize global variables
var interval = null, jobs = [], postComponents = [], posts = [], count = 0, scrollInterval =0; postWrapper = '';

/**
 * PostUtil contains utility functions for FB post lookup and prepare list for worker to pick job
 */
var postUtil = {
    lookup: function () {
        postComponents = [];
        var postWrapper = $("div[aria-describedby]");
        postWrapper.each((k, v) => {
            let postDescription = $(v).find("blockquote span div:first");
            let deep = this.deepest(postDescription);
            if (deep)
                postComponents.push({
                    "post": $(v),
                    "text": deep.text()
                });
        });
    },
    deepest: function (node) {
        //DFS search
        let deep = node;
        while (node.length) {
            node = $(node).children();
            if (node.length > 0) {
                deep = node;
            }
        }
        return deep;
    },
    getPostText: function(post){
        let _postComponents = postComponents.filter(function(el){
            return el.post == post;
        });
        if(_postComponents.length>0){
            return _postComponents[0]["text"];
        }
        return '';
    },
    fetchPost: function () {
        if (posts.length > 0) {
            let post = posts.pop();
            return post;
        }
        return null;
    },
    isEmpty: function () {
        return !posts.length > 0;
    },
    preparePost: function (index) {
        posts = [];
        //-1 for all posts
        if (index == -1) {
            if (postComponents.length > 0) {
                postComponents.forEach((v, k) => {
                    posts.push(v["post"]);
                });
            }
            
        }
        else {
            posts.push(postComponents[index]["post"]);
        }
    }

}

/***
 * Worker will pick job from stack and trigger like event 
 */
var worker = {
    start: function (post) {
        template.updateStatus("#lbl-processing",'Processing '+postUtil.getPostText(post),30);
        this.fetchJobs(post);
        if (!interval)
            interval = setInterval(() => {
                let like = jobs.pop();
                if(like && scrollInterval >5){
                    scrollInterval = 0;
                    template.scrollTo(like);
                }
                if (like && $(like)) {
                    $(like).trigger('click');
                    count++;
                    scrollInterval++;
                    this.updateCount(count, 0);
                }
                else if (this.viewMore(post)) {
                    this.fetchJobs(post);
                }
                else {
                    this.stop();
                    this.startNextPost();
                }
            }, 1000); // Time in milliseconds
    },
    stop: function () {
        clearInterval(interval);
        interval = null;
        template.updateStatus("#lbl-processing",'Job stopped!',30);
    },
    viewMore: function (post) {
        let findViewMore = function () {
            return $(post).find('span').filter(function () { return ($(this).text() === 'View previous comments') });
        }
        let viewMore = findViewMore();
        if (viewMore) {
            viewMore.trigger('click');
            return true;
        }
        return false;
    },
    fetchJobs: function (postWrapper) {
        var likes = $(postWrapper).find('ul [aria-label="Like"]');
        if (likes) {
            likes.each(function (k, v) {
                jobs.push($(v).find('span'));
            });
        }
    },
  
    startNextPost() {
        if (!postUtil.isEmpty()) {
            let tempPost = postUtil.fetchPost();
            this.start(tempPost);
        }
        else {
            //notify task completed - post scan completed
            template.updateStatus("#lbl-processing",'Post Completed!',30);
        }
    },
    updateCount: function (totalTriggered, totalScanned) {
        $('#comments-liked').text(totalTriggered);
    }
}



var template = {
    render: function () {
        document.getElementsByTagName("head")[0];
        var body = document.getElementsByTagName("body")[0];
        var wrapper = document.createElement("div");
        wrapper.setAttribute("id", "outer-wrapper");
        wrapper.setAttribute("style", 'background-color:#e7e5f3;border:1px solid #0014ff14;font-size:24px;padding:20px;height:300px;text-align:center;font-family:"lucida grande",tahoma,verdana,arial,sans-serif;width:40%;position:fixed;margin:0 auto;z-index:999;top: 5px;left:30%;font-size:1.5em;');
        body.appendChild(wrapper);
        let template = '<button id="btn-close" style="border: 1px solid #e7e7e7;cursor:pointer;position:absolute;right:0px;top:0px;" type="button" class="close" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> <div id="settings"> <p>Please select Facebook post:</p><input type="radio" value="all" id="all_post" name="scan-option"> <label for="all_post">All</label><input type="radio" value="single post" id="single_post" name="scan-option" checked> <label for="single_post">Single Post</label><div id="select_post_wrapper" style="margin-bottom:10px;><label id="lbl_select_post">Select Post:</label> <select id="select_post"> </select></div></div><button id="btn-start" type="button" class="btn btn-primary" style="color: #fff;background-color: #007bff;border-color: #007bff;cursor: pointer;display: inline-block;font-weight: 400;width: 85px;text-align: center;white-space: nowrap;vertical-align: middle;border: 1px solid transparent;padding: .375rem .75rem;font-size: 1rem;line-height: 11px;border-radius: .25rem;transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;">Start</button> <br><br><div id="status-update" style="text-align: left;font-weight: bold;"><label id="lbl-processing"></label><br/> <label>Total comments liked: <span id="comments-liked"></span></label> </div><br><br><button id="btn-stop" type="button" class="btn btn-danger" style="color: #fff;background-color: #dc3545;border-color: #dc3545;cursor: pointer;display: inline-block;font-weight: 400;width: 85px;text-align: center;white-space: nowrap;vertical-align: middle;border: 1px solid transparent;padding: .375rem .75rem;font-size: 1rem;line-height: 11px;border-radius: .25rem;transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;">Stop</button>';
        wrapper.innerHTML = template;
    },
    remove: function () {
        $('#outer-wrapper').remove();
    },
    renderOptions: function () {
        postComponents.forEach((v, k) => {
            $('#select_post')
                .append($("<option></option>")
                    .attr("value", k)
                    .text(this.truncate(v.text,20)));
        });
    },
    removeOptions: function () {
        $('#select_post')
            .find('option')
            .remove()
    },
    hideComponents: function () {
        $('#select_post_wrapper').hide();
        $('#btn-stop').hide();
    },
    truncate: function(str, n) {
        return (str.length > n) ? str.substr(0, n-1) + '...' : str;
    },
    updateStatus: function(lbl, text, mxChar){
        $(lbl).text(this.truncate(text, mxChar));
    },
    scrollTo: function (element) {
        var targetEle = $(element).hash;
        var $targetEle = $(element);
        $('html, body').stop().animate({
            'scrollTop': $targetEle.offset().top
        }, 800, 'swing', function () {
            window.location.hash = targetEle;
        });
    },
}
// Initialie plugin
var initialize = function () {
    if ($('#outer-wrapper').length > 0) {
        template.remove();
    }
    else {
        template.render();
        template.hideComponents();
        $('#status-update').hide();

        //fetch all posts
        postUtil.lookup();
        template.removeOptions(); //clear previously rendered options
        template.renderOptions();
        $('#select_post_wrapper').show();
        $('#select_post').val(0).trigger('change');
    }

};
initialize();

//******* START jQuery event listeners ********/
$('#btn-start').on('click', function () {
    $('#btn-stop').show();
    $('#status-update').show();
    if(posts.length==0)
        postUtil.preparePost(0);
    //select selected options
    worker.start(postUtil.fetchPost());
})

$('#btn-stop').on('click', function () {
    $('#btn-stop').hide();
    worker.stop();
})

$('#btn-close').on("click", function () {
    template.remove();
});

$('#select_post').on('change', function () {
    postUtil.preparePost(parseInt(this.value));
});

$('input[type=radio][name=scan-option').on('change', function () {
    if (this.value == 'all') {
        postUtil.preparePost(-1);
        template.hideComponents();
    } else {
        template.removeOptions(); //clear previously rendered options
        template.renderOptions();
        $('#select_post_wrapper').show();
        $('#select_post').trigger('change');
    }
});
//******* END jQuery event listeners ********/

