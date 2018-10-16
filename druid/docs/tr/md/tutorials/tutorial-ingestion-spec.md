本教程会指导读者通过定义导入配置的过程，指出主要的考虑和指南。  
在本教程，我们已经假设你已经在你本地机器下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid。    
完成 [教程：加载文件](#!/tutorials/tutorial-batch)、[教程：查询数据](#!/tutorials/tutorial-query) 和 [教程：Rollup](#!/tutorials/tutorial-rollup) 的阅读会更有帮助。

### 样例数据
假设我们有如下的网络流量数据：
- `srcIP`: 发送端IP
- `srcPort`: 发送端端口
- `dstIP`: 接口端IP
- `dstPort`: 接收端端口
- `protocol`: IP协议号
- `packets`: 传输的数据包数量
- `bytes`: 传输的数据字节数
- `cost`: 流量传输花费

```
{"ts":"2018-01-01T01:01:35Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":2000, "dstPort":3000, "protocol": 6, "packets":10, "bytes":1000, "cost": 1.4}
{"ts":"2018-01-01T01:01:51Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":2000, "dstPort":3000, "protocol": 6, "packets":20, "bytes":2000, "cost": 3.1}
{"ts":"2018-01-01T01:01:59Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":2000, "dstPort":3000, "protocol": 6, "packets":30, "bytes":3000, "cost": 0.4}
{"ts":"2018-01-01T01:02:14Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":5000, "dstPort":7000, "protocol": 6, "packets":40, "bytes":4000, "cost": 7.9}
{"ts":"2018-01-01T01:02:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":5000, "dstPort":7000, "protocol": 6, "packets":50, "bytes":5000, "cost": 10.2}
{"ts":"2018-01-01T01:03:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":5000, "dstPort":7000, "protocol": 6, "packets":60, "bytes":6000, "cost": 4.3}
{"ts":"2018-01-01T02:33:14Z","srcIP":"7.7.7.7", "dstIP":"8.8.8.8", "srcPort":4000, "dstPort":5000, "protocol": 17, "packets":100, "bytes":10000, "cost": 22.4}
{"ts":"2018-01-01T02:33:45Z","srcIP":"7.7.7.7", "dstIP":"8.8.8.8", "srcPort":4000, "dstPort":5000, "protocol": 17, "packets":200, "bytes":20000, "cost": 34.5}
{"ts":"2018-01-01T02:35:45Z","srcIP":"7.7.7.7", "dstIP":"8.8.8.8", "srcPort":4000, "dstPort":5000, "protocol": 17, "packets":300, "bytes":30000, "cost": 46.3}
```

保存上述JSON到`examples`目录下的`ingestion-tutorial-data.json`  
然后继续下面的流程，定义一个用于加载上述数据的导入配置。  
本教程我们会使用本地批处理indexing任务。如果用其他任务类型，一些导入配置的配置项会有所不同，这里也会指出具体的不同。

### 定义Schema
Druid导入配置的核心元素是`dataSchema`。他定义了如何解析输入数据成存储到Druid的数据列集的方法。  
我们开始先定义一个空的`dataSchema`，然后一步步顺着教程添加配置项。  
在`examples`目录下创建一个文件，文件名为`ingestion-tutorial-index.json`，内容为:
```
"dataSchema" : {}
```
#### Datasource的名称
datasource名称由`dataSchema`的`dataSource`字段指定，我们命名这个教程案例datasource名称为`ingestion-tutorial`：
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
}
```
#### 选择一个解析器
每个`dataSchema`都有一个`parser`字段，定义Druid如何解析输入数据:  
由于我们的数据是JSON格式的，这里我们使用一个json格式字符串解析器:
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json"
    }
  }
}
```
#### 时间列
解析器需要知道怎么解析出输入数据的主要时间戳字段。如果使用json的`parseSpec`，使用`timestampSpec`定义时间戳字段。  
输入数据的时间戳列名叫`ts`，使用ISO 8601格式，所以我们在`parseSpec`下增加一个`timestampSpec`字段，内容如下:
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      }
    }
  }
}
```
#### 列的类型
时间列一定定义好了，我们看一下其他列。  
Druid支持列类型有：`String`, `Long`, `Float`, `Double`。下面的章节我们会看到如何使用这些类型。  
在这之前，我们先讨论一下rollup。
#### Rollup
导入数据之前我们需要考虑一下是否需要使用rollup。  
如果打开rollup，我们需要把输入的列分为两类，维度 和 指标。维度是rollup组合汇总的根据，指标是要聚合的列。  
如果关闭rollup，那么所有列都会当成维度 ，不会有预先聚合。  
这里，我们选择打开rollup。这个在`dataSchema`的`granularitySpec`配置项定义。  
注意`granularitySpec`字段在`parser`字段外面。但是我们待会会回到`parser`字段里，定义我们的 维度 和 指标   
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      }
    }
  },
  "granularitySpec" : {
    "rollup" : true
  }
}
```
##### 选择维度和指标
对于这个样例数据集，很容易区分维度和指标:
- 维度: `srcIP`, `srcPort`, `dstIP`, `dstPort`, `protocol`
- 指标: `packets`, `bytes`, `cost`

这里的维度是标识一对单向IP流量的一组属性，指标是根据维度分组指定的IP流量的事实。  
接下来看如何配置这些维度和指标
##### 维度
维度定义在`parseSpec`的`dimensionsSpec`
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      },
      "dimensionsSpec" : {
        "dimensions": [
          "srcIP",
          { "name" : "srcPort", "type" : "long" },
          { "name" : "dstIP", "type" : "string" },
          { "name" : "dstPort", "type" : "long" },
          { "name" : "protocol", "type" : "string" }
        ]
      }
    }
  },
  "granularitySpec" : {
    "rollup" : true
  }
}
```
每个指标有一个名称`name`和一个类型`type`，类型可以是`long`, `float`, `double`, 或者 `string`。  
`srcIP`是一个字符串`string`维度。对于字符串维度，只需要定义维度名称就足够了，因为维度的默认类型就是字符串。  
`protocol`是一个数字型`numeric`的维度，但是我们还是当成字符串导入；Druid在导入时会自动把long转为string。
###### Strings vs. Numerics
怎么判定一个数字型的维度，是按数字型的维度，还是按字符串维度导入?  
相比字符串，数字型有以下优缺点:
- 优点：在读取列值是，占用更小的空间和更低的处理开销
- 缺点：没有索引，因此过滤会比对等的字符串维度(位图索引)要慢

##### 指标
指标定义在`dataSchema`的`metricsSpec`字段:
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      },
      "dimensionsSpec" : {
        "dimensions": [
          "srcIP",
          { "name" : "srcPort", "type" : "long" },
          { "name" : "dstIP", "type" : "string" },
          { "name" : "dstPort", "type" : "long" },
          { "name" : "protocol", "type" : "string" }
        ]
      }   
    }
  },
  "metricsSpec" : [
    { "type" : "count", "name" : "count" },
    { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
    { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
    { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
  ],
  "granularitySpec" : {
    "rollup" : true
  }
}
```
定义metric需要制定rollup需要执行的聚合类型。  
这里我们定义两个整型`long`类型指标`packets`和`bytes`，和一个浮点型`double`类型的`cost`。  
注意`metricsSpec`与`dimensionSpec`或者`parseSpec`都不在一个嵌套级别内；而是在`dataSchema`内，和`parser`一个嵌套级别。  
注意我们还定义了一个`count`聚合。这个聚合会统计有多少行的原始输入数据合并到最终导入的"rolled up"行里。

#### 不 rollup
如果我们不适用rollup, 所有列在`dimensionsSpec`定制：
```
      "dimensionsSpec" : {
        "dimensions": [
          "srcIP",
          { "name" : "srcPort", "type" : "long" },
          { "name" : "dstIP", "type" : "string" },
          { "name" : "dstPort", "type" : "long" },
          { "name" : "protocol", "type" : "string" },
          { "name" : "packets", "type" : "long" },
          { "name" : "bytes", "type" : "long" },
          { "name" : "srcPort", "type" : "double" }
        ]
      },
```
#### 定义粒度
到这里，我们已经完成在`dataSchema`里的`parser`和`metricsSpec`的定义，可以说我们差不多完成导入配置的编写。
这里还需要一些额外的`granularitySpec`属性:
- granularitySpec的类型：支持`uniform`和`arbitrary`两种类型。本章节会使用`uniform`粒度配置，表示所有segment包含相同的时间粒度(例如每个segment都包含一个小时的数据)。
- segment粒度：时间粒度的大小，也就是segment包含多大时间段的数据，如`DAY`，`WEEK`。
- 时间列中时间戳的分桶粒度(也称为queryGranularity)

##### Segment粒度
segment粒度定义在`granularitySpec`的`segmentGranularity`字段。这里我们需要创建小时级的segment:
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      },
      "dimensionsSpec" : {
        "dimensions": [
          "srcIP",
          { "name" : "srcPort", "type" : "long" },
          { "name" : "dstIP", "type" : "string" },
          { "name" : "dstPort", "type" : "long" },
          { "name" : "protocol", "type" : "string" }
        ]
      }
    }
  },
  "metricsSpec" : [
    { "type" : "count", "name" : "count" },
    { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
    { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
    { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
  ],
  "granularitySpec" : {
    "type" : "uniform",
    "segmentGranularity" : "HOUR",
    "rollup" : true
  }
}
```
我们的输入数据落在两个不同的小时，因此任务会产生两个segment。
##### Query粒度
查询粒度配置在`granularitySpec`的`queryGranularity`字段。这里使用分钟粒度。
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      },
      "dimensionsSpec" : {
        "dimensions": [
          "srcIP",
          { "name" : "srcPort", "type" : "long" },
          { "name" : "dstIP", "type" : "string" },
          { "name" : "dstPort", "type" : "long" },
          { "name" : "protocol", "type" : "string" }
        ]
      }      
    }
  },
  "metricsSpec" : [
    { "type" : "count", "name" : "count" },
    { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
    { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
    { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
  ],
  "granularitySpec" : {
    "type" : "uniform",
    "segmentGranularity" : "HOUR",
    "queryGranularity" : "MINUTE"
    "rollup" : true
  }
}
```
查看查询粒度的效果，我们先看原始数据:
```
{"ts":"2018-01-01T01:03:29Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":5000, "dstPort":7000, "protocol": 6, "packets":60, "bytes":6000, "cost": 4.3}
```
当数据按分钟查询粒度导入，Druid会将时间戳格式化到分钟:
```
{"ts":"2018-01-01T01:03:00Z","srcIP":"1.1.1.1", "dstIP":"2.2.2.2", "srcPort":5000, "dstPort":7000, "protocol": 6, "packets":60, "bytes":6000, "cost": 4.3}
```
#### 定义一个时间段(只有批处理生效)
对于批处理任务需要定义一个时间段，时间戳在时间段之外的数据会被忽略掉:  
这个时间段也定义在`granularitySpec`
```
"dataSchema" : {
  "dataSource" : "ingestion-tutorial",
  "parser" : {
    "type" : "string",
    "parseSpec" : {
      "format" : "json",
      "timestampSpec" : {
        "format" : "iso",
        "column" : "ts"
      },
      "dimensionsSpec" : {
        "dimensions": [
          "srcIP",
          { "name" : "srcPort", "type" : "long" },
          { "name" : "dstIP", "type" : "string" },
          { "name" : "dstPort", "type" : "long" },
          { "name" : "protocol", "type" : "string" }
        ]
      }      
    }
  },
  "metricsSpec" : [
    { "type" : "count", "name" : "count" },
    { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
    { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
    { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
  ],
  "granularitySpec" : {
    "type" : "uniform",
    "segmentGranularity" : "HOUR",
    "queryGranularity" : "MINUTE",
    "intervals" : ["2018-01-01/2018-01-02"],
    "rollup" : true
  }
}
```
### 定义任务类型
到此我们已经定义好我们的`dataSchema`。剩下的步骤就是把`dataSchema`放在一个导入任务配置里，然后指定输入源。
`dataSchema`适用于所有任务类型，但是每种类型有其特定的格式。这里我们使用本地批处理导入任务:
```
{
  "type" : "index",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "ingestion-tutorial",
      "parser" : {
        "type" : "string",
        "parseSpec" : {
          "format" : "json",
          "timestampSpec" : {
            "format" : "iso",
            "column" : "ts"
          },
          "dimensionsSpec" : {
            "dimensions": [
              "srcIP",
              { "name" : "srcPort", "type" : "long" },
              { "name" : "dstIP", "type" : "string" },
              { "name" : "dstPort", "type" : "long" },
              { "name" : "protocol", "type" : "string" }
            ]              
          }      
        }
      },
      "metricsSpec" : [
        { "type" : "count", "name" : "count" },
        { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
        { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
        { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "HOUR",
        "queryGranularity" : "MINUTE",
        "intervals" : ["2018-01-01/2018-01-02"],
        "rollup" : true
      }
    }
  }
}
```
### 定义输入源
在`ioConfig`定义我们的输入源。每种任务类型有其特定类型的`ioConfig`。本地批处理使用`firehose`来读取输入数据，因此我们这里定义个本地`local`的`firehose`来读读之前保存的流量数据：
```
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "examples/",
        "filter" : "ingestion-tutorial-data.json"
      }
    }
```
```
{
  "type" : "index",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "ingestion-tutorial",
      "parser" : {
        "type" : "string",
        "parseSpec" : {
          "format" : "json",
          "timestampSpec" : {
            "format" : "iso",
            "column" : "ts"
          },
          "dimensionsSpec" : {
            "dimensions": [
              "srcIP",
              { "name" : "srcPort", "type" : "long" },
              { "name" : "dstIP", "type" : "string" },
              { "name" : "dstPort", "type" : "long" },
              { "name" : "protocol", "type" : "string" }
            ]
          }
        }
      },
      "metricsSpec" : [
        { "type" : "count", "name" : "count" },
        { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
        { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
        { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "HOUR",
        "queryGranularity" : "MINUTE",
        "intervals" : ["2018-01-01/2018-01-02"],
        "rollup" : true
      }
    },
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "examples/",
        "filter" : "ingestion-tutorial-data.json"
      }
    }
  }
}
```
### 额外的调整
每个导入任务都有一个`tuningConfig`字段，允许用户调整一些导入参数。
例如，我们添加一个`tuningConfig`, 给本地批处理任务设置一个目标segment大小
```
    "tuningConfig" : {
      "type" : "index",
      "targetPartitionSize" : 5000000
    }
```
注意每种任务类型都有其特定的`tuningConfig`格式。
### 最终配置:
我们已经完成了我们的导入配置，应该是长这样的:
```
{
  "type" : "index",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "ingestion-tutorial",
      "parser" : {
        "type" : "string",
        "parseSpec" : {
          "format" : "json",
          "timestampSpec" : {
            "format" : "iso",
            "column" : "ts"
          },
          "dimensionsSpec" : {
            "dimensions": [
              "srcIP",
              { "name" : "srcPort", "type" : "long" },
              { "name" : "dstIP", "type" : "string" },
              { "name" : "dstPort", "type" : "long" },
              { "name" : "protocol", "type" : "string" }
            ]
          }
        }
      },
      "metricsSpec" : [
        { "type" : "count", "name" : "count" },
        { "type" : "longSum", "name" : "packets", "fieldName" : "packets" },
        { "type" : "longSum", "name" : "bytes", "fieldName" : "bytes" },
        { "type" : "doubleSum", "name" : "cost", "fieldName" : "cost" }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "HOUR",
        "queryGranularity" : "MINUTE",
        "intervals" : ["2018-01-01/2018-01-02"],
        "rollup" : true
      }
    },
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "examples/",
        "filter" : "ingestion-tutorial-data.json"
      }
    },
    "tuningConfig" : {
      "type" : "index",
      "targetPartitionSize" : 5000000
    }
  }
}
```
### 提交任务并查询数据
在`druid-0.12.3`目录，执行:
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/ingestion-tutorial-index.json http://localhost:8090/druid/indexer/v1/task
```
然后执行查询，  
我们执行一个`a select * from "ingestion-tutorial";`查询来看导入的数据:
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/ingestion-tutorial-select-sql.json http://localhost:8082/druid/v2/sql
```
```
[
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "bytes": 6000,
    "cost": 4.9,
    "count": 3,
    "dstIP": "2.2.2.2",
    "dstPort": 3000,
    "packets": 60,
    "protocol": "6",
    "srcIP": "1.1.1.1",
    "srcPort": 2000
  },
  {
    "__time": "2018-01-01T01:02:00.000Z",
    "bytes": 9000,
    "cost": 18.1,
    "count": 2,
    "dstIP": "2.2.2.2",
    "dstPort": 7000,
    "packets": 90,
    "protocol": "6",
    "srcIP": "1.1.1.1",
    "srcPort": 5000
  },
  {
    "__time": "2018-01-01T01:03:00.000Z",
    "bytes": 6000,
    "cost": 4.3,
    "count": 1,
    "dstIP": "2.2.2.2",
    "dstPort": 7000,
    "packets": 60,
    "protocol": "6",
    "srcIP": "1.1.1.1",
    "srcPort": 5000
  },
  {
    "__time": "2018-01-01T02:33:00.000Z",
    "bytes": 30000,
    "cost": 56.9,
    "count": 2,
    "dstIP": "8.8.8.8",
    "dstPort": 5000,
    "packets": 300,
    "protocol": "17",
    "srcIP": "7.7.7.7",
    "srcPort": 4000
  },
  {
    "__time": "2018-01-01T02:35:00.000Z",
    "bytes": 30000,
    "cost": 46.3,
    "count": 1,
    "dstIP": "8.8.8.8",
    "dstPort": 5000,
    "packets": 300,
    "protocol": "17",
    "srcIP": "7.7.7.7",
    "srcPort": 4000
  }
]
```
