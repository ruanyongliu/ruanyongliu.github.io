索引任务是Druid本地批量导入机制。任务运行在索引服务内部，无需安装另外的Hadoop。任务配置语法如下：
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
          "timestampSpec" : {
            "column" : "timestamp",
            "format" : "auto"
          },
          "dimensionsSpec" : {
            "dimensions": ["page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city"],
            "dimensionExclusions" : [],
            "spatialDimensions" : []
          }
        }
      },
      "metricsSpec" : [
        {
          "type" : "count",
          "name" : "count"
        },
        {
          "type" : "doubleSum",
          "name" : "added",
          "fieldName" : "added"
        },
        {
          "type" : "doubleSum",
          "name" : "deleted",
          "fieldName" : "deleted"
        },
        {
          "type" : "doubleSum",
          "name" : "delta",
          "fieldName" : "delta"
        }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "DAY",
        "queryGranularity" : "NONE",
        "intervals" : [ "2013-08-31/2013-09-01" ]
      }
    },
    "ioConfig" : {
      "type" : "index",
      "firehose" : {
        "type" : "local",
        "baseDir" : "examples/indexing/",
        "filter" : "wikipedia_data.json"
       }
    },
    "tuningConfig" : {
      "type" : "index",
      "targetPartitionSize" : 5000000,
      "maxRowsInMemory" : 75000
    }
  }
}
```

### 任务属性

属性 | 描述 | 必须?
---- | ---- | ----
type | 这里必须是index | 是
id | 任务ID。如果不显示声明，Druid会用任务类型、datasource名称、时间段和日期-时间戳生成一个任务ID | 否
spec | 包括`dataSchema`, `ioConfig`和`tuningConfig`配置。详情请看下面 | 是
context | 包括多个任务配置参数。详情请看下面 | 否

### 任务优先级
Druid的索引任务用锁保证数据导入的原子性。锁会在datasource和时间段上获得。一旦有一个任务获得了一个锁，他就可以给对应的datasource和时间段写数据，直到锁被释放或者被抢占。

每个任务都有一个获得锁的优先级。如果同时请求相同datasource和相同时间段的上的锁，高优先级的任务就能抢占低优先级任务的这个锁。如果任务的锁被抢占，不同的任务会有不同的处理方式，通常会表示失败然后结束。

任务根据类型有不同的默认优先级，这里列举了各类型的默认优先级，数字越大优先级越高:

任务类型 | 默认优先级
---- | ----
实时导入 | 75
批量导入 | 50
合并/追加/压缩 | 25
其他 | 0

可以通过修改`context`来自定义优先级:
```
"context" : {
  "priority" : 100
}
```

### DataSchema
必须。详情请看[导入配置DataSchema](#!/ingestion/ingestion-spec#dataschema)

### IOConfig

属性 | 描述 | 默认值 | 必须?
---- | ---- | ---- | ----
type | 任务类型，这里必须是index | | 是
firehose | 声明一个[Firehose](#!/ingestion/firehose) | | 是
appendToExisting | 创建的segment作为最新版本的附加分片，添加到当前的segment集合而不是替换掉。只有是segment的 `shardSpecs` 配置为 `extendable` 类型才起作用(通过在 `tuningConfig` 打开 `forceExtendableShardSpecs` 来配置) | false | 否

### TuningConfig
`tuningConfig`是可选配置，如果没有显示声明会使用默认值，详情：

属性 | 描述 | 默认值 | 必须?
---- | ---- | ---- | ----
type | 任务类型，这里必须是index | | 是
targetPartitionSize | 分片配置，确定每个segment包含的数据行数 | 5,000,000 | 否
maxRowsInMemory | 内存保存的最大数据行数，也就是决定持久化到硬盘的发生条件 | 75,000 | 否
maxTotalRows | segment保存的最大行数，也就是决定发布segment的发生条件 | 150,000 | 否
numShards | 直接定义分片数，如果声明了，并且 `granularitySpec` 的 `intervals` 也声明了，任务会跳过时间间隔分区。不能和 `targetPartitionSize` 同时设置 | | 否
indexSpec | 定义segment导入时的存储格式 | | 否
maxPendingPersists | 等待但还没开始的持久化过程的最大数量。如果一个持久化过程开始导致数量上超出了限制，导入会被阻塞直到当前运行的持久化过程结束。服务最多会使用 `maxRowsInMemory x (2 + maxPendingPersists)` 这么多的堆物理内存空间。| 0 (表示只能同时执行一个持久化过程，并且没有其他在等待) | 否
forceExtendableShardSpecs | 强制使用 `extendable` 的 `shardSpecs` 配置。旨在与[Kafka索引服务扩展](/TODO)一起使用的实验功能。 | false | 否
forceGuaranteedRollup | 强制保证[perfect rollup](#!/ingestion#perfect-rollup)。优化segment的大小和查询效率。导入的时间会增加。不能和 `IOConfig` 的 `appendToExisting` 和 `forceExtendableShardSpecs` 一起使用。详情请看下面**segment发布模式**章节 | false | 否
reportParseExceptions | true表示导入中的exception会catch住并终止导入；否则对应错误行会跳过 | false | 否
publishTimeout | 单位毫秒。segment发布最长等待时间。0表示一直等待 | 0 | 否
segmentWriteOutMediumFactory | segment写出介质，创建segment时使用。请参考[其他Peon配置:SegmentWriteOutMediumFactory](/TODO)。| druid.peon.defaultSegmentWriteOutMediumFactory | 否

### IndexSpec
定义segment存储格式，在导入时使用。例如位图索引类型和压缩格式。一般都有默认值，所以是可选的。

属性 | 类型 | 描述 | 默认值
---- | ---- | ---- | ----
bitmap | JSON | 位图索引的压缩格式。详情看看下面 | Concise
dimensionCompression | 字符串 | 维度的压缩格式，有LZ4, LZF, uncompressed(不压缩) | LZ4
metricCompression | 字符串 | 指标的压缩格式，有LZ4, LZF, uncompressed(不压缩), none | LZ4
longEncoding | 字符串 | 维度和指标中整型类型的编码格式，有auto或者longs。auto根据列上值的基数使用位移或者维度表编码，和不固定的大小来存储；long使用8 bytes来存储 | longs

#### 位图类型
##### Concise位图:

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 必须是concise | 是

##### Roaring位图

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 必须是roaring | 是
compressRunOnSerialization | 布尔值 | 运行时预估长度来编码，更好的空间使用效率 | 否，默认true

### segment发布模式
使用索引任务导入数据，任务负责根据输入数据创建和发布segment。对于segment发布，任务支持类型segment发布模式——bulk发布模式和incremental发布模式，分别对应perfect rollup和best-effort rollup。
- **bluk发布模式**，任务会在完成时才会发布segment。在这之前，创建的segment会存储在运行时的节点的内存和本地存储。结果就是这种模式可能会带来存储空间不足的问题，因此不推荐在生产环境上使用。
- **incremental发布模式**，segment增量发布，因此可以在任务运行期间发布。更准确地说，任务收集数据，存储在运行时的内存和本地硬盘，直到行数超过了`maxTotalRows`设置。一旦到了设置上限，任务会立即发布所有的segment，然后清除，继续导入数据。

如果要打开bulk发布模式，`forceGuaranteedRollup`要设置上。注意不能和`forceExtendableShardSpecs` 和 `appendToExisting` 一起使用。

