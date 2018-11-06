Druid导入配置包含三部分:
```
{
  "dataSchema" : {...},
  "ioConfig" : {...},
  "tuningConfig" : {...}
}
```

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
dataSchema | JSON | 指定输入数据的形式。所有导入配置可以共享相同的dataSchema | 是
ioConfig | JSON | 指定数据的来源和数据的目的地。不同的导入方式格式会不一样 | 是
tuningConfig | JSON | 指定如何调整多个导入参数。不同的导入方式格式会不一样 | 否

### DataSchema
例:
```
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
        "dimensions": [
          "page",
          "language",
          "user",
          "unpatrolled",
          "newPage",
          "robot",
          "anonymous",
          "namespace",
          "continent",
          "country",
          "region",
          "city",
          {
            "type": "long",
            "name": "countryNum"
          },
          {
            "type": "float",
            "name": "userLatitude"
          },
          {
            "type": "float",
            "name": "userLongitude"
          }
        ],
        "dimensionExclusions" : [],
        "spatialDimensions" : []
      }
    }
  },
  "metricsSpec" : [{
    "type" : "count",
    "name" : "count"
  }, {
    "type" : "doubleSum",
    "name" : "added",
    "fieldName" : "added"
  }, {
    "type" : "doubleSum",
    "name" : "deleted",
    "fieldName" : "deleted"
  }, {
    "type" : "doubleSum",
    "name" : "delta",
    "fieldName" : "delta"
  }],
  "granularitySpec" : {
    "segmentGranularity" : "DAY",
    "queryGranularity" : "NONE",
    "intervals" : [ "2013-08-31/2013-09-01" ]
  },
  "transformSpec" : null
}
```

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
dataSource | 字符串 | datasource名称，datasource可以对比想象为一个表(table) | 是
parser | JSON | 指定数据的解析方式 | 是
metricsSpec | JSON | 需要聚合的[指标](/TODO)列表 | 是
granularitySpec | JSON | 设定segment创建和roll up的粒度 | 是
transformSpec | JSON | 指定输入数据过滤和转换的方式，可浏览[转换配置](/TODO) | 否

### Parser
`parser`的默认类型是`string`。更多的数据格式，请阅读[扩展列表](/TODO)。

#### String Parser

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
type | 字符串 | 一般是`string`，或者如果使用的Hadoop索引任务时的`hadoopyString` | 否
parseSpec | JSON | 指定格式、时间戳和数据的维度 | 是

##### ParseSpec

`parseSpecs`两个用途:
- 字符串Parser使用它们来确定数据格式(如JSON、CSV或者TSV)。
- 所有Parser使用它们来确定时间戳字段和数据的维度。

`parseSpec`默认的格式是tsv。

###### JSON ParseSpec
用于加载json格式的数据

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
format | 字符串 | 这里必须是`json` | 否
timestampSpec | JSON | 指定时间戳对应的列名和格式 | 是
dimensionsSpec | JSON | 指定数据有哪些维度 | 是
flattenSpec | JSON | 指定嵌套JSON格式的数据的展开规则配置，更多信息请阅读[JSON展开](/TODO) | 否

###### JSON Lowercase ParseSpec

<div class="alert alert-warning" role="alert">
目前已经被废弃，并且在未来版本删除。
</div>
这是JSON ParseSpec下的一个特殊类型，将输入的JSON格式的数据的列名改为小写。在`0.6.x`和`0.7.x`版本，如果输入的数据带有混合大小写的列名但是想不用其他ETL工具的情况下把列名改为小写，这个`parseSpec`是必须的。

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
format | 字符串 | 这里必须是`jsonLowercase` | 是
timestampSpec | JSON | 指定时间戳对应的列名和格式 | 是
dimensionsSpec | JSON | 指定数据有哪些维度 | 是

###### CSV ParseSpec
用于加载csv格式的数据。解析过程用的com.opencsv的库

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
format | 字符串 | 这里必须是csv | 是
timestampSpec | JSON | 指定时间戳对应的列名和格式 | 是
dimensionsSpec | JSON | 指定数据有哪些维度 | 是
listDelimiter | 字符串 | 用于指明多值维度的分隔符 | 否，默认`Ctrl + A`(疑问`Ctrl + A`是什么字符)
columns | JSON数组 | 指定数据的列名 | 是

###### TSV / 分割的 ParseSpec
用于加载所有分割的文本，可以不需要特定的分隔符。因为默认的分隔符是`tab`，默认会加载tsv。

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
format | 字符串 | 这里必须是tsv | 是
timestampSpec | JSON | 指定时间戳对应的列名和格式 | 是
dimensionsSpec | JSON | 指定数据有哪些维度 | 是
delimiter | 字符串 | 指定数据的分隔符 | 默认`\t`
listDelimiter | 字符串 | 用于指明多值维度的分隔符 | 否，默认`Ctrl + A`(疑问`Ctrl + A`是什么字符)
columns | JSON数组 | 指定数据的列名 | 是

###### TimeAndDims ParseSpec
用于非字符串Parser提供时间戳和维度信息。非字符串Parser自己处理所有格式化决策，不用ParseSpec。

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
format | 字符串 | 这里必须是timeAndDims | 是
timestampSpec | JSON | 指定时间戳对应的列名和格式 | 是
dimensionsSpec | JSON | 指定数据有哪些维度 | 是

#### TimestampSpec

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
column | 字符串 | 时间戳列名 | 是
format | 字符串 | `iso`, `millis`, `posix`, `auto`或者其他任意[Joda](http://joda-time.sourceforge.net/apidocs/org/joda/time/format/DateTimeFormat.html)时间格式 | 否，默认`auto`

#### DimensionsSpec
配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
dimensions | JSON数组 | 一组维度名称或者维度结构对象。提供一个名称相当于提供一个该名称的字符串类型的维度结构对象。如果数组为空，Druid会把非时间戳列和指标列视为字符串类型的维度列 | 是
dimensionExclusions | 字符串JSON数组 | 导入时需要排除的维度 | 否，默认`[]`
spatialDimensions | JSON数组 | 一个[空间维度](/TODO)数组 | 否，默认`[]`

##### <a id="dimension-schema" class="anchor">维度结构对象</a>
维度结构对象指定了数据上一列的类型和名称。

对于字符串列，维度结构可以通过设置`createBitmapIndex`开启或关闭位图索引。默认情况下位图索引对于所有字符串类型的列都是开启的。只有字符串类型可以可用位图索引，数字型的列还不支持。

例如下面的`dimensionsSpec`，有一列`Long`类型`countryNum`，两列`Float`(`userLatitude`和`userLongitude`)，其他列都为字符串，其中`comment`列关闭了位图索引。
```
"dimensionsSpec" : {
  "dimensions": [
    "page",
    "language",
    "user",
    "unpatrolled",
    "newPage",
    "robot",
    "anonymous",
    "namespace",
    "continent",
    "country",
    "region",
    "city",
    {
      "type": "string",
      "name": "comment",
      "createBitmapIndex": false
    },
    {
      "type": "long",
      "name": "countryNum"
    },
    {
      "type": "float",
      "name": "userLatitude"
    },
    {
      "type": "float",
      "name": "userLongitude"
    }
  ],
  "dimensionExclusions" : [],
  "spatialDimensions" : []
}
```
#### metricsSpec
`metricsSpec`是一组[聚合指标](/TODO). 如果`rollup`设置为`false`，这个配置项应该填一个空的数组，然后所有列定义在`dimensionsSpec`(不使用rollup, 维度和指标在导入时不会有什么明显的区别)。所以这是可选的。

#### GranularitySpec
默认的粒度是`uniform`，或者通过`type`设定。目前支持`uniform`和`arbitrary`两种类型

##### Uniform Granularity Spec
这个配置项用于创建统一的时间段。

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
segmentGranularity | 字符串 | segment的创建粒度 | 否，默认`DAY`
queryGranularity | 字符串 | 最小的可查询的粒度，也是segment保存数据的粒度。例如`minute`表示数据会按分钟级别聚合。也就是说，如果数据在元组`minute(timestamp), dimensions`上冲突，Druid会使用聚合器将数据汇总在一起，而不是存储单独的数据行。`NONE`粒度表示的毫秒粒度 | 否，默认`NONE`
rollup | 布尔 | 是否rollup | 否，默认`true`
intervals | 字符串 | 导入数据落在的时间返回。实时导入会忽略这个参数 | 否，如果指定了，批量导入任务可能会跳过分区决定阶段，导致更快的导入

##### Arbitrary Granularity Spec
用于创建任意时间段的segment(尝试创建大小均匀的segment)。不支持实时处理流程。

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
queryGranularity | 字符串 | 最小的可查询的粒度，也是segment保存数据的粒度。例如`minute`表示数据会按分钟级别聚合。也就是说，如果数据在元组`minute(timestamp), dimensions`上冲突，Druid会使用聚合器将数据汇总在一起，而不是存储单独的数据行。`NONE`粒度表示的毫秒粒度 | 否，默认`NONE`
rollup | 布尔 | 是否rollup | 否，默认`true`
intervals | 字符串 | 导入数据落在的时间返回。实时导入会忽略这个参数 | 否，如果指定了，批量导入任务可能会跳过分区决定阶段，导致更快的导入
#### Transform Spec
指定输入数据过滤和转换的方式，可浏览[转换配置](/TODO)。

### IO Config
不同的任务类型，有不同的格式：
- 本地批处理 : [本地批处理IOConfig](/TODO)
- Hadoop批处理 : [Hadoop批处理IOConfig](/TODO)
- Kafka索引服务 : [Kafka Supervisor IOConfig](/TODO)
- 流式推送 : Tranquility流式推送不需要IO Config
- 流式拉取(已废弃) : [流式拉取导入](/TODO)


### Tuning Config
不同的任务类型，有不同的格式：
- 本地批处理 : [本地批处理TunningConfig](/TODO)
- Hadoop批处理 : [Hadoop批处理TunningConfig](/TODO)
- Kafka索引服务 : [Kafka Supervisor TuningConfig](/TODO)
- 流式推送 : [Tranquility TunningConfig](/TODO)
- 流式拉取(已废弃) : [流式拉取导入](/TODO)


### 评估时间戳，维度和指标
Druid会按照下面的顺序解析维度、排除的维度和指标:
- `dimensions`里的列会被视为维度。
- `dimension exclusions`里的列会排除在维度外。
- 时间戳和指标列默认会排除在维度外。
- 如果指标也要定义在维度里，指标必须和维度有不同的名称。

