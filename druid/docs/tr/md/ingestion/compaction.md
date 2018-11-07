压缩任务合并时间段内的所有segment，语法：
```
{
    "type": "compact",
    "id": <task_id>,
    "dataSource": <task_datasource>,
    "interval": <interval to specify segments to be merged>,
    "dimensions" <custom dimensionsSpec>,
    "tuningConfig" <index task tuningConfig>,
    "context": <task context>
}
```

属性 | 描述 | 必须
---- | ---- | ----
type | 这里必须是`compact` | 是
id | 任务id | 否
dataSource | 待压缩的datasource | 是
interval | 待压缩segment时间段 | 是
dimensions | 自定义`dimensionsSpec`。如果不存在任务也会创建一个，详情请看下面 | 否
tuningConfig | 索引任务的tuningConfig | 否
context | 任务上下文配置 | 否

例:
```
{
  "type" : "compact",
  "dataSource" : "wikipedia",
  "interval" : "2017-01-01/2018-01-01"
}
```

任务读取落在`2017-01-01/2018-01-01`的所有segment并且合并成一个新的。注意不管segment粒度是多少，所有的segment都会最终合并到一个单一的时间段等于`2017-01-01/2018-01-01`的segment。如果想控制结果segment的数据量，可以通过设置`targetPartitionSize`和`numShards`实现，详情请看[indexTuningConfig](#!/ingestion/native-batch#tuningconfig)。如果需要合并每天的数据并且按天分开segment，可以提到多个压缩任务，每个对应一天。任务可以并行执行。

压缩任务在内部生成一个索引服务配置，使用一些固定参数来执行压缩工作。例如，`firehose`总是[ingestSegmentSpec](#!/ingestion/firehose#segment-firehose)，`dimensionsSpec`和`metricsSpec`默认包含所有的待合并的segment的维度和指标。

如果给定的时间段内没有segment，或者设定的时间段为空，压缩任务会退出返回一个错误状态码，除此以外没有其他动作。

除非所有待合并的segment有相同的元数据，结果segment可能会有不同的元数据。

- 维度：因为Druid支持结构热更新，相同datasource下的segment也可能有不同的维度。如果待合并的segment包含不同的维度，那么输出的segment基本包含所有出现的维度。但是，即使包含相同的维度，维度的顺序和类型也有可能不一样。例如一些维度就可能从字符串转为其他基础类型，或者维度顺序的改变实现局部更优。这种情况下，较新的维度会优先于旧的维度。因为较新的segment会更有可能迎合新的目标顺序和类型。如果你想使用你自己的排序和类型，你可以自定义一个的`dimensionsSpec`。
- Roll-up：只有所有的待合并的segment设置rollup，结果segment才会执行rollup。 详情请看[Roll up](#!/ingestion#-rollup)。你可以使用[Segment元数据查询](/TODO)来检查你的segment是否rollup。
- 分区：压缩任务实际上是一种特殊的本地批量索引任务，因此总是基于所有维度的hash值来分区。

