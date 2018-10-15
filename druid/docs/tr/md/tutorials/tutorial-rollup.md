Druid在导入时使用一个进程，称为`roll-up`，来汇总原始数据。Roll-up是一个作用在维度集合之上的顶级的聚合操作，聚合一个指标集合，来减少存储segment的数据量。  
本章节会在一个样例数据集上阐述`roll-up`的效果。  
在本教程，我们已经假设你已经在你本地机器下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid。  
完成 [教程：加载文件](#!/tutorials/tutorial-batch) 和 [教程：查询数据](#!/tutorials/tutorial-query) 的阅读会更有帮助。
### 样例数据
在本章节我们使用一个小的网络流量事件数据作为样例，包含了在一段时间内的两个端点之间的网络包的的数量和大小。
```
{"timestamp":"2018-01-01T01:01:35Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":20,"bytes":9024}
{"timestamp":"2018-01-01T01:01:51Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":255,"bytes":21133}
{"timestamp":"2018-01-01T01:01:59Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":11,"bytes":5780}
{"timestamp":"2018-01-01T01:02:14Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":38,"bytes":6289}
{"timestamp":"2018-01-01T01:02:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":377,"bytes":359971}
{"timestamp":"2018-01-01T01:03:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":49,"bytes":10204}
{"timestamp":"2018-01-02T21:33:14Z","srcIP":"7.7.7.7", "dstIP":"8.8.8.8","packets":38,"bytes":6289}
{"timestamp":"2018-01-02T21:33:45Z","srcIP":"7.7.7.7", "dstIP":"8.8.8.8","packets":123,"bytes":93999}
{"timestamp":"2018-01-02T21:35:45Z","srcIP":"7.7.7.7", "dstIP":"8.8.8.8","packets":12,"bytes":2818}
```
包含这个输入数据的文件在`examples/rollup-data.json`  
我们使用下面的导入任务配置来导入数据，配置放在`examples/rollup-ingest.json`
```
{
  "type" : "index",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "rollup-tutorial",
      "parser" : {
        "type" : "string",
        "parseSpec" : {
          "format" : "json",
          "dimensionsSpec" : {
            "dimensions" : [
              "srcIP",
              "dstIP"
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
        { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
        { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "week",
        "queryGranularity" : "minute",
        "intervals" : ["2018-01-01/2018-01-03"],
        "rollup" : true
      }
    },
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "examples",
        "filter" : "rollup-data.json"
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
Roll-up已经通过配置项`granularitySpec`里的`"rollup": true`开启了。  
我们把`srcIP`和`dstIP`定义为维度，`packets`和`bytes`定义为整型指标，查询粒度设为分钟。  
我们之后会看到加载数据之后这个定义是怎么被使用的。
### 加载样例数据
在`druid-0.12.3`目录，执行：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/rollup-index.json http://localhost:8090/druid/indexer/v1/task
```
数据加载后，开始查询数据。
### 查询样例数据
我们执行一个`select * from "rollup-tutorial"`命令；查询看我们导入的数据。  
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/rollup-select-sql.json http://localhost:8082/druid/v2/sql
```
结果返回
```
[
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "bytes": 35937,
    "count": 3,
    "dstIP": "2.2.2.2",
    "packets": 286,
    "srcIP": "1.1.1.1"
  },
  {
    "__time": "2018-01-01T01:02:00.000Z",
    "bytes": 366260,
    "count": 2,
    "dstIP": "2.2.2.2",
    "packets": 415,
    "srcIP": "1.1.1.1"
  },
  {
    "__time": "2018-01-01T01:03:00.000Z",
    "bytes": 10204,
    "count": 1,
    "dstIP": "2.2.2.2",
    "packets": 49,
    "srcIP": "1.1.1.1"
  },
  {
    "__time": "2018-01-02T21:33:00.000Z",
    "bytes": 100288,
    "count": 2,
    "dstIP": "8.8.8.8",
    "packets": 161,
    "srcIP": "7.7.7.7"
  },
  {
    "__time": "2018-01-02T21:35:00.000Z",
    "bytes": 2818,
    "count": 1,
    "dstIP": "8.8.8.8",
    "packets": 12,
    "srcIP": "7.7.7.7"
  }
]
```
回头看原始数据在`2018-01-01T01:01`这一刻的三个事件数据:
```
{"timestamp":"2018-01-01T01:01:35Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":20,"bytes":9024}
{"timestamp":"2018-01-01T01:01:51Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":255,"bytes":21133}
{"timestamp":"2018-01-01T01:01:59Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":11,"bytes":5780}
```
已经被roll up到下面一行了：
```
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "bytes": 35937,
    "count": 3,
    "dstIP": "2.2.2.2",
    "packets": 286,
    "srcIP": "1.1.1.1"
  },
```
输入数据已经根据时间戳`timestamp`和维度列`{timestamp, srcIP, dstIP}`来汇总`packets`和`bytes`指标了。  
由于导入配置的配置项`"queryGranularity":"minute"`，在汇总前，输入数据的时间戳格式化到分钟了。  
同样，下面两个在`2018-01-01T01:02`的事件被roll up成:
```
{"timestamp":"2018-01-01T01:02:14Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":38,"bytes":6289}
{"timestamp":"2018-01-01T01:02:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":377,"bytes":359971}
```
```
  {
    "__time": "2018-01-01T01:02:00.000Z",
    "bytes": 366260,
    "count": 2,
    "dstIP": "2.2.2.2",
    "packets": 415,
    "srcIP": "1.1.1.1"
  },
```
最后的发生在`1.1.1.1`和`2.2.2.2`的记录，由于是唯一一条在`2018-01-01T01:03`的事件，不会有roll up发生:
```
{"timestamp":"2018-01-01T01:03:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2","packets":49,"bytes":10204}
```
```
  {
    "__time": "2018-01-01T01:03:00.000Z",
    "bytes": 10204,
    "count": 1,
    "dstIP": "2.2.2.2",
    "packets": 49,
    "srcIP": "1.1.1.1"
  },
```
留意指标`count`展示了由多少条原始输入数据合并成这条最终的"roll-up"记录。

