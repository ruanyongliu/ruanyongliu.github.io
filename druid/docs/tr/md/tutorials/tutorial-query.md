本教程介绍如何从Druid查询数据，这里会介绍Druid自带的格式和SQL格式。

我们假设你已经完成前面4个导入教程中的至少一个了，因为我们需要查询维基修改样例数据。
- [教程：加载文件](#!tutorials/tutorial-batch)
- [教程：从Kafka加载流式数据](#!tutorials/tutorial-kafka)
- [教程：使用Hadoop加载批量数据](#!tutorials/tutorial-batch-hadoop)
- [教程：Http推送流式数据](#!tutorials/tutorial-tranquility)

### 自带JSON格式
Druid自带的JSON查询格式。我们已经包含了一个自带的TopN查询样例，在`examples/wikipedia-top-pages.json`:
```
{
  "queryType" : "topN",
  "dataSource" : "wikipedia",
  "intervals" : ["2015-09-12/2015-09-13"],
  "granularity" : "all",
  "dimension" : "page",
  "metric" : "count",
  "threshold" : 10,
  "aggregations" : [
    {
      "type" : "count",
      "name" : "count"
    }
  ]
}
```
这个查询抓取10个在2015-09-12页面修改次数最多的维基页面信息。

提交到Druid broker:
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-top-pages.json http://localhost:8082/druid/v2?pretty
```
应该会得到如下查询结果返回:
```
[ {
  "timestamp" : "2015-09-12T00:46:58.771Z",
  "result" : [ {
    "count" : 33,
    "page" : "Wikipedia:Vandalismusmeldung"
  }, {
    "count" : 28,
    "page" : "User:Cyde/List of candidates for speedy deletion/Subpage"
  }, {
    "count" : 27,
    "page" : "Jeremy Corbyn"
  }, {
    "count" : 21,
    "page" : "Wikipedia:Administrators' noticeboard/Incidents"
  }, {
    "count" : 20,
    "page" : "Flavia Pennetta"
  }, {
    "count" : 18,
    "page" : "Total Drama Presents: The Ridonculous Race"
  }, {
    "count" : 18,
    "page" : "User talk:Dudeperson176123"
  }, {
    "count" : 18,
    "page" : "Wikipédia:Le Bistro/12 septembre 2015"
  }, {
    "count" : 17,
    "page" : "Wikipedia:In the news/Candidates"
  }, {
    "count" : 17,
    "page" : "Wikipedia:Requests for page protection"
  } ]
} ]
```

### Druid SQL查询
Druid也支持SQL语法查询，下面是一个与上述自带JSON查询相同的SQL查询:
```
SELECT page, COUNT(*) AS Edits FROM wikipedia WHERE "__time" BETWEEN TIMESTAMP '2015-09-12 00:00:00' AND TIMESTAMP '2015-09-13 00:00:00' GROUP BY page ORDER BY Edits DESC LIMIT 10;
```
SQL查询也是先转成JSON格式，通过HTTP提交
#### TopN查询样例
Druid用例包里有一个包含上述SQL查询的样例文件在`examples/wikipedia-top-pages-sql.json`。提交到Druid broker:
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-top-pages-sql.json http://localhost:8082/druid/v2/sql
```
期望结果:
```
[
  {
    "page": "Wikipedia:Vandalismusmeldung",
    "Edits": 33
  },
  {
    "page": "User:Cyde/List of candidates for speedy deletion/Subpage",
    "Edits": 28
  },
  {
    "page": "Jeremy Corbyn",
    "Edits": 27
  },
  {
    "page": "Wikipedia:Administrators' noticeboard/Incidents",
    "Edits": 21
  },
  {
    "page": "Flavia Pennetta",
    "Edits": 20
  },
  {
    "page": "Total Drama Presents: The Ridonculous Race",
    "Edits": 18
  },
  {
    "page": "User talk:Dudeperson176123",
    "Edits": 18
  },
  {
    "page": "Wikipédia:Le Bistro/12 septembre 2015",
    "Edits": 18
  },
  {
    "page": "Wikipedia:In the news/Candidates",
    "Edits": 17
  },
  {
    "page": "Wikipedia:Requests for page protection",
    "Edits": 17
  }
]
```

#### 格式化打印
Druid SQL不支持结果的格式化打印。上面的格式化使用了`jq`JSON工具。往下的教程会继续使用jq格式化来显示SQL查询结果。

#### 更多的Druid SQL查询
下面的章节提供更多自带Druid查询对应的SQL查询样例。

##### Timeseries
SQL timeseries查询样例在`examples/wikipedia-timeseries-sql.json`。抓取2015-09-12每小时从页面删除的行数数据。
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-timeseries-sql.json http://localhost:8082/druid/v2/sql
```
期望结果:
```
[
  {
    "HourTime": "2015-09-12T00:00:00.000Z",
    "LinesDeleted": 1761
  },
  {
    "HourTime": "2015-09-12T01:00:00.000Z",
    "LinesDeleted": 16208
  },
  {
    "HourTime": "2015-09-12T02:00:00.000Z",
    "LinesDeleted": 14543
  },
  {
    "HourTime": "2015-09-12T03:00:00.000Z",
    "LinesDeleted": 13101
  },
  {
    "HourTime": "2015-09-12T04:00:00.000Z",
    "LinesDeleted": 12040
  },
  {
    "HourTime": "2015-09-12T05:00:00.000Z",
    "LinesDeleted": 6399
  },
  {
    "HourTime": "2015-09-12T06:00:00.000Z",
    "LinesDeleted": 9036
  },
  {
    "HourTime": "2015-09-12T07:00:00.000Z",
    "LinesDeleted": 11409
  },
  {
    "HourTime": "2015-09-12T08:00:00.000Z",
    "LinesDeleted": 11616
  },
  {
    "HourTime": "2015-09-12T09:00:00.000Z",
    "LinesDeleted": 17509
  },
  {
    "HourTime": "2015-09-12T10:00:00.000Z",
    "LinesDeleted": 19406
  },
  {
    "HourTime": "2015-09-12T11:00:00.000Z",
    "LinesDeleted": 16284
  },
  {
    "HourTime": "2015-09-12T12:00:00.000Z",
    "LinesDeleted": 18672
  },
  {
    "HourTime": "2015-09-12T13:00:00.000Z",
    "LinesDeleted": 30520
  },
  {
    "HourTime": "2015-09-12T14:00:00.000Z",
    "LinesDeleted": 18025
  },
  {
    "HourTime": "2015-09-12T15:00:00.000Z",
    "LinesDeleted": 26399
  },
  {
    "HourTime": "2015-09-12T16:00:00.000Z",
    "LinesDeleted": 24759
  },
  {
    "HourTime": "2015-09-12T17:00:00.000Z",
    "LinesDeleted": 19634
  },
  {
    "HourTime": "2015-09-12T18:00:00.000Z",
    "LinesDeleted": 17345
  },
  {
    "HourTime": "2015-09-12T19:00:00.000Z",
    "LinesDeleted": 19305
  },
  {
    "HourTime": "2015-09-12T20:00:00.000Z",
    "LinesDeleted": 22265
  },
  {
    "HourTime": "2015-09-12T21:00:00.000Z",
    "LinesDeleted": 16394
  },
  {
    "HourTime": "2015-09-12T22:00:00.000Z",
    "LinesDeleted": 16379
  },
  {
    "HourTime": "2015-09-12T23:00:00.000Z",
    "LinesDeleted": 15289
  }
]
```
##### GroupBy
SQL GroupBy查询样例在`examples/wikipedia-groupby-sql.json`。抓取2015-09-12每个维基语言分类(渠道)添加的行数数据。
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-groupby-sql.json http://localhost:8082/druid/v2/sql
```
期望结果:
```
[
  {
    "channel": "#en.wikipedia",
    "EXPR$1": 3045299
  },
  {
    "channel": "#it.wikipedia",
    "EXPR$1": 711011
  },
  {
    "channel": "#fr.wikipedia",
    "EXPR$1": 642555
  },
  {
    "channel": "#ru.wikipedia",
    "EXPR$1": 640698
  },
  {
    "channel": "#es.wikipedia",
    "EXPR$1": 634670
  }
]
```
##### Scan
SQL Scan查询样例在`examples/wikipedia-scan-sql.json`。抓取5个 用户-页面 数据对。
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-scan-sql.json http://localhost:8082/druid/v2/sql
```
期望结果:
```
[
  {
    "user": "Thiago89",
    "page": "Campeonato Mundial de Voleibol Femenino Sub-20 de 2015"
  },
  {
    "user": "91.34.200.249",
    "page": "Friede von Schönbrunn"
  },
  {
    "user": "TuHan-Bot",
    "page": "Trĩ vàng"
  },
  {
    "user": "Lowercase sigmabot III",
    "page": "User talk:ErrantX"
  },
  {
    "user": "BattyBot",
    "page": "Hans W. Jung"
  }
]
```
##### EXPLAIN PLAN FOR
在Druid SQL查询前添加EXPLAIN PLAN FOR，可以看到SQL查询转成自带查询的计划。
一个之前提供过的，描述顶部页面查询的样例在`examples/wikipedia-explain-sql.json`:
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-explain-top-pages-sql.json http://localhost:8082/druid/v2/sql
```
应该返回以下计划:
```
[
  {
    "PLAN": "DruidQueryRel(query=[{\"queryType\":\"topN\",\"dataSource\":{\"type\":\"table\",\"name\":\"wikipedia\"},\"virtualColumns\":[],\"dimension\":{\"type\":\"default\",\"dimension\":\"page\",\"outputName\":\"d0\",\"outputType\":\"STRING\"},\"metric\":{\"type\":\"numeric\",\"metric\":\"a0\"},\"threshold\":10,\"intervals\":{\"type\":\"intervals\",\"intervals\":[\"2015-09-12T00:00:00.000Z/2015-09-13T00:00:00.001Z\"]},\"filter\":null,\"granularity\":{\"type\":\"all\"},\"aggregations\":[{\"type\":\"count\",\"name\":\"a0\"}],\"postAggregations\":[],\"context\":{},\"descending\":false}], signature=[{d0:STRING, a0:LONG}])\n"
  }
]
```
### 进阶
更多Druid自带查询的信息，请浏览[查询文档](/TODO)

更多Druid SQL查询的信息，请浏览[Druid SQL文档](/TODO)

