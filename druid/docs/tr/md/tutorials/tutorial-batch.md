### 开始
本教程介绍如何执行一个批处理文件加载，使用Druid本地批处理导入。

我们假设你已经下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid服务。你暂不需要再加载任何数据

### 准备数据和导入任务配置
一个数据加载过程会在提交导入任务给Druid Overlord之后被初始化。本教程我们会加载维基修改数据作为样例

我们提供了一个导入配置在`examples/wikipedia-index.json`，用于配置读取`quickstart/wikiticker-2015-09-12-sampled.json.gz`文件。为了方便，我们在这里直接展示：
```
{
  "type" : "index",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "wikipedia",
      "parser" : {
        "type" : "string",
        "parseSpec" : {
          "format" : "json",
          "dimensionsSpec" : {
            "dimensions" : [
              "channel",
              "cityName",
              "comment",
              "countryIsoCode",
              "countryName",
              "isAnonymous",
              "isMinor",
              "isNew",
              "isRobot",
              "isUnpatrolled",
              "metroCode",
              "namespace",
              "page",
              "regionIsoCode",
              "regionName",
              "user",
              { "name": "added", "type": "long" },
              { "name": "deleted", "type": "long" },
              { "name": "delta", "type": "long" }
            ]
          },
          "timestampSpec": {
            "column": "time",
            "format": "iso"
          }
        }
      },
      "metricsSpec" : [],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "day",
        "queryGranularity" : "none",
        "intervals" : ["2015-09-12/2015-09-13"],
        "rollup" : false
      }
    },
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "quickstart/",
        "filter" : "wikiticker-2015-09-12-sampled.json.gz"
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

这份配置会创建一个datasource，名为wikipedia。

### 加载批量文件
我们已经给到一个2015年9月12日的维基编辑样例数据给你。

要加载这份数据给Druid，你可以提交一个指向这个文件的导入任务。要提交这个任务，在`druid-0.12.3`目录启动一个新Terminal，发送一个POST请求：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-index.json http://localhost:8090/druid/indexer/v1/task
```
提供成功后会返回任务ID:
```
{"task":"index_wikipedia_2018-06-09T21:30:32.802Z"}
```
查看导入任务的状态，可以访问：http://localhost:8090/console.html 。你可以周期地刷新网页，任务成功之后，你应该能看见一个`SUCCESS`状态。

导入任务完成后，数据会被加载至historical节点，并且在一到两分钟后可被查询。你可以通过coordinator控制台监控加载数据的过程，检查是否wikipedia这个datasource，旁边有一个蓝圈表示为完全可用。

![](http://druid.io/docs/0.12.3/tutorials/img/tutorial-batch-01.png)

### 查询数据
一到两分钟之后你的数据应该能完全可用了。你可以通过Coordinator控制台http://localhost:8081/#/ 监控这个过程。

一旦数据加载完毕，请查看[查询教程](#!/tutorials/tutorial-query)来对新加载的数据执行一些查询。

### 清理
如果你希望继续其他导入教程，你需要[重置集群](#!/tutorials#resetting-cluster-state)，因为其他教程也会写到这个`wikipedia`datasource。

### 更多
更多批处理数据加载的信息，请浏览[批处理导入教程](/TODO)

