DocsTr = {
    prefix: "/druid/docs/tr",
    part: ["", "部署教程", "数据导入"],
    map: [
        [
            ["design", "Druid简介"]
        ],
        [
            ["tutorials", "Quickstart"],
            ["tutorials/tutorial-batch", "加载文件"],
            ["tutorials/tutorial-kafka", "从Kafka加载流式数据"],
            ["tutorials/tutorial-batch-hadoop", "使用Hadoop加载批量数据"]
        ], 
        [
            ["ingestion", "简介"]
        ]
    ],
    navRender: function(e) {
        var ul = $("<ul class=\"nav nav-stacked\"></ul>")
        for (var i in DocsTr.part) {
            if (i > 0) {
                ul.append("<li role=\"presentation\" class=\"divider\">" + DocsTr.part[i] + "</li>")
            }
            for (var j in DocsTr.map[i]) {
                var li = $("<li role=\"presentation\"></li>")
                if (DocsTr.map[i][j][0] == e) {
                    li.addClass("active").append("<a href=\"#\">" + DocsTr.map[i][j][1] + "</a>")
                } else {
                    li.append("<a href=\"" + DocsTr.prefix + "/" + DocsTr.map[i][j][0] + "\">" + DocsTr.map[i][j][1] + "</a>")
                }
                ul.append(li)
            }
        }
        $(".nav").html("").append(ul)
    }
}
