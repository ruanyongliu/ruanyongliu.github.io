本教程会介绍如何使用转换配置来过滤和如何在转换导入数据。  
我们假设你已经在你本地机器下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid。    
完成 [教程：加载文件](#!/tutorials/tutorial-batch) 和 [教程：查询数据](#!/tutorials/tutorial-query) 的阅读会更有帮助。

### 样例数据
我们已经提供了一份样例数据，在`examples/transform-data.json`。为了方便，我们在这里展示一下：
```
{"timestamp":"2018-01-01T07:01:35Z","animal":"octopus",  "location":1, "number":100}
{"timestamp":"2018-01-01T05:01:35Z","animal":"mongoose", "location":2,"number":200}
{"timestamp":"2018-01-01T06:01:35Z","animal":"snake", "location":3, "number":300}
{"timestamp":"2018-01-01T01:01:35Z","animal":"lion", "location":4, "number":300}
```

### 使用转换配置加载数据
使用以下配置来导入样例数据，同时借此介绍一下转换配置的使用
```
{
  "type" : "index",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "transform-tutorial",
      "parser" : {
        "type" : "string",
        "parseSpec" : {
          "format" : "json",
          "dimensionsSpec" : {
            "dimensions" : [
              "animal",
              { "name": "location", "type": "long" }
            ]
          },
          "timestampSpec": {
            "column": "timestamp",
            "format": "iso"
          }
        }
      },
      "metricsSpec" : [
        { "type" : "count", "name" : "count" },
        { "type" : "longSum", "name" : "number", "fieldName" : "number" },
        { "type" : "longSum", "name" : "triple-number", "fieldName" : "triple-number" }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "week",
        "queryGranularity" : "minute",
        "intervals" : ["2018-01-01/2018-01-03"],
        "rollup" : true
      },
      "transformSpec": {
        "transforms": [
          {
            "type": "expression",
            "name": "animal",
            "expression": "concat('super-', animal)"
          },
          {
            "type": "expression",
            "name": "triple-number",
            "expression": "number * 3"
          }
        ],
        "filter": {
          "type":"or",
          "fields": [
            { "type": "selector", "dimension": "animal", "value": "super-mongoose" },
            { "type": "selector", "dimension": "triple-number", "value": "300" },
            { "type": "selector", "dimension": "location", "value": "3" }
          ]
        }
      }
    },
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "examples/",
        "filter" : "transform-data.json"
      },
      "appendToExisting" : false
    },
    "tuningConfig" : {
      "type" : "index",
      "targetPartitionSize" : 5000000,
      "maxRowsInMemory" : 25000,
      "forceExtendableShardSpecs" : true
    }
  }
}
```
在这个转换配置，一共有两个转换公式：
- `super-animal`: 在所有`animal`列的值前添加`super-`，由于转换项里的`name`也是`animal`，这会覆盖掉原来的`animal`列。
- `triple-number`：创建一个新的`triple-number`列，值为`number`列的值乘以3。注意原来的值和新的值都会被导入。

此外我们还有一个`OR`类型的过滤`filter`，一共有三项：
- `super-animal`要等于`super-mongoose`
- `triple-number`要等于`300`
- `location`要等于`3`

这个过滤会保留样例数据的前三行，丢弃掉最后一行`lion`。过滤会在转换之后执行。  
配置有同样一份在`examples/transform-index.json`，提交：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/transform-index.json http://localhost:8090/druid/indexer/v1/task
```

### 查询转换后的数据
执行一个`select * from "transform-tutorial";`，查看导入的数据
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/transform-select-sql.json http://localhost:8082/druid/v2/sql
```
```
[
  {
    "__time": "2018-01-01T05:01:00.000Z",
    "animal": "super-mongoose",
    "count": 1,
    "location": 2,
    "number": 200,
    "triple-number": 600
  },
  {
    "__time": "2018-01-01T06:01:00.000Z",
    "animal": "super-snake",
    "count": 1,
    "location": 3,
    "number": 300,
    "triple-number": 900
  },
  {
    "__time": "2018-01-01T07:01:00.000Z",
    "animal": "super-octopus",
    "count": 1,
    "location": 1,
    "number": 100,
    "triple-number": 300
  }
]
```
`lion`对应的一行已经被丢弃掉，`animal`列已经被转换，原来的`number`列和转换的`triple-number`列也都存在。
