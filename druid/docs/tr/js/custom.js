DocsTr = {
    nav: [
        {
            display: "开始",
            nav: [
                {
                    display: "设计",
                    url: "design",
                    nav: [
                        {
                            display: "导入总览",
                            url: "ingestion"
                        }
                    ]
                },
                {
                    display: "Quickstart",
                    url: "tutorials",
                    nav: [
                        {
                            display: "教程: 加载文件",
                            url: "tutorials/tutorial-batch"
                        },
                        {
                            display: "教程: 从Kafka加载流式数据",
                            url: "tutorials/tutorial-kafka"
                        },
                        {
                            display: "教程: 使用Hadoop加载批量数据",
                            url: "tutorials/tutorial-batch-hadoop"
                        },
                        {
                            display: "教程: Http推送流式数据",
                            url: "tutorials/tutorial-tranquility"
                        },
                        {
                            display: "查询数据",
                            url: "tutorials/tutorial-query"
                        }
                    ]
                },
                {
                    display: "进阶教程",
                    nav: [
                        {
                            display: "教程：Rollup",
                            url: "tutorials/tutorial-rollup"
                        },
                        {
                            display: "教程：保留配置",
                            url: "tutorials/tutorial-retention"
                        },
                        {
                            display: "教程：更新现有数据",
                            url: "tutorials/tutorial-update-data"
                        },
                        {
                            display: "教程：删除数据",
                            url: "tutorials/tutorial-delete-data"
                        },
                        {
                            display: "教程：编写你自己的导入配置",
                            url: "tutorials/tutorial-ingestion-spec"
                        },
                        {
                            display: "教程：转化输入数据",
                            url: "tutorials/tutorial-transform-spec"
                        }
                    ]
                },
                {
                    display: "集群化",
                    url: "tutorials/cluster"
                }
            ]
        }
    ],
    navPartElement: function(tree) {
        var ul = $("<ul class=\"nav nav-stacked\"></ul>")
        for (var i in tree) {
            var item = tree[i]
            var li
            if (item.url) {
                li = $("<li role=\"presentation\" data-url=\"" + item.url + "\"></li>")
                li.append("<a href=\"#!/" + item.url + "\">" + item.display + "</a>")
            } else {
                li = $("<li role=\"presentation\" class=\"nav-static\">" + item.display + "</li>")
            }
            if (item.nav) {
                li.append(DocsTr.navPartElement(item.nav))
            }
            ul.append(li)
        }
        return ul
    },
    navRender: function() {
        var tag = $(".nav0")
        tag.html("")
        for (var i in DocsTr.nav) {
            var part = DocsTr.nav[i]
            tag.append("<h3>" + part.display + "</h3>")
            tag.append(DocsTr.navPartElement(part.nav))
        }
    },
    titleRecur: function(u, tree) {
        for (var i in tree) {
            if (tree[i].url == u) {
                return tree[i].display
            }
            if (tree[i].nav) {
                var t = DocsTr.titleRecur(u, tree[i].nav)
                if (t != null) {
                    return t;
                }
            }
        }
        return null;
    },
    title: function(u) {
        return DocsTr.titleRecur(u, DocsTr.nav)
    }
}
