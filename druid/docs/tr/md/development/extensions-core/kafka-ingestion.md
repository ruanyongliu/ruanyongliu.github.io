Kafka索引服务可以在Overlord配置supervisor，通过管理Kakfa索引任务的创建和其生命周期来从Kafka完成导入。这个索引任务使用kafka原生的分区和偏移机制来读取事件，因此可以提供精确一次`exactly-once`的导入。他们还可以读取过去的事件，不受像其他导入机制那样的时间窗口限制。supervisor负责监督索引任务的状态，协调切换，管理错误，确保扩展和备份需求可维护。

服务在核心扩展(请看[包含的扩展](/TODO))`druid-kafka-indexing-service`有提供。请注意目前Kafka索引服务还是一个实验性功能，并且受到一般的[实验性警告](/TODO)的约束。

<div class="alert alert-info" role="alert">
Kafka索引服务使用Kafka`0.10.x`版本的Java消费者。由于这个版本在协议上有更新，Kafka`0.10.x`消费者和旧的broker不兼容。所以请保证你的Kafka broker的版本比`0.10.x`更新。有更新的需要请看[Kafka更新指南](https://kafka.apache.org/documentation/#upgrade)
</div>

### 提交一个supervisor配置
Kafka索引服务要求overlord和middle manager都要加载`druid-kafka-indexing-service`扩展。通过提交一个HTTP POST请求到 `http://<OVERLORD_IP>:<OVERLORD_PORT>/druid/indexer/v1/supervisor` 来启动一个supervisor：
```
curl -X POST -H 'Content-Type: application/json' -d @supervisor-spec.json http://localhost:8090/druid/indexer/v1/supervisor
```
supervisor配置：
```
{
  "type": "kafka",
  "dataSchema": {
    "dataSource": "metrics-kafka",
    "parser": {
      "type": "string",
      "parseSpec": {
        "format": "json",
        "timestampSpec": {
          "column": "timestamp",
          "format": "auto"
        },
        "dimensionsSpec": {
          "dimensions": [],
          "dimensionExclusions": [
            "timestamp",
            "value"
          ]
        }
      }
    },
    "metricsSpec": [
      {
        "name": "count",
        "type": "count"
      },
      {
        "name": "value_sum",
        "fieldName": "value",
        "type": "doubleSum"
      },
      {
        "name": "value_min",
        "fieldName": "value",
        "type": "doubleMin"
      },
      {
        "name": "value_max",
        "fieldName": "value",
        "type": "doubleMax"
      }
    ],
    "granularitySpec": {
      "type": "uniform",
      "segmentGranularity": "HOUR",
      "queryGranularity": "NONE"
    }
  },
  "tuningConfig": {
    "type": "kafka",
    "maxRowsPerSegment": 5000000
  },
  "ioConfig": {
    "topic": "metrics",
    "consumerProperties": {
      "bootstrap.servers": "localhost:9092"
    },
    "taskCount": 1,
    "replicas": 1,
    "taskDuration": "PT1H"
  }
}
```

### supervisor配置

属性 | 描述 | 必须?
---- | ---- | ----
type | 这里必须是`kafka` | 是
dataSchema | Kafka索引任务加载的结构定义，详情请看[导入配置DataSchema](#!/ingestion/ingestion-spec#dataschema) | 是
tuningConfig | 配置supervisor和索引任务的KafkaSupervisorTuningConfig，详情请看下面 | 否
ioConfig | 配置supervisor和索引任务的KafkaSupervisorIOConfig | 是

#### KafkaSupervisorTuningConfig
可选

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 这里必须是`kafka` | 是
maxRowsInMemory | 整数 | 持久化前的数据行数，由于rollup这个行数不一定等于输入数据的行数。这个配置用来控制JVM堆内存空间。索引任务最大的内存使用量是maxRowsInMemory x (2 + maxPendingPersists) | 否，默认75,000
maxRowsPerSegment | 整数 | segment包含的聚合后的数据行数 | 否，默认5,000,000
intermediatePersistPeriod | ISO8601 | 确定临时持久化发生速率的时间段 | 否，默认PT10M
maxPendingPersists | 整数 | 等待但还没开始的持久化过程的最大数量。如果一个持久化过程开始导致数量上超出了限制，导入会被阻塞直到当前运行的持久化过程结束。服务最多会使用 `maxRowsInMemory x (2 + maxPendingPersists)` 这么多的堆物理内存空间。| 否，默认0 (表示只能同时执行一个持久化过程，并且没有其他在等待)
indexSpec | 定义segment导入时的存储格式，详情请看下面 | 否
reportParseExceptions | true表示导入中的exception会catch住并终止导入；否则对应错误行会跳过 | 否，默认false
handoffConditionTimeout | 整数 | 单位毫秒。segment handoff最长等待时间。0表示一直等待 | 否，默认0
resetOffsetAutomatically | 布尔型 | 是否重新设置consumer偏移量，如果下一个抓取的偏移量比特定分区最早可用的偏移量要小。消费者偏移量根据KafkaSupervisorIOConfig(请看下面)的`useEarliestOffset`决定使用最早的还是最晚的偏移量。这个情况一般发生在Kafka的消息不在有效，因此也不会导入Kafka。如果设置为false，情况发生时导入就会停止，需要手动的干预。具体的`重置supervisor API`请看下面 | 否，默认false
workerThreads | 整数 | supervisor并行操作的最大线程数 | 否则，默认min(10, `taskCount`)
chatThreads | 整数 | 与索引任务通讯的线程数 | 否，默认min(10, `taskCount x replicas`)
chatRetries | 整数 | 给索引任务的HTTP请求失败的重试次数 | 否则，默认8
httpTimeout | ISO8601 | 等待索引任务的最长响应时间 | 否，默认PT10S
shutdownTimeout | ISO8601 | supervisor等待任务正常关闭的最长时间 | 否，默认PT80S
offsetFetchPeriod | ISO8601 | supervisor查询Kafka和索引任务获取偏移量和计算延迟的间隔 | 否则，默认PT30S，最小PT5S
segmentWriteOutMediumFactory | 字符串 | segment写出介质，创建segment时使用。请参考[其他Peon配置:SegmentWriteOutMediumFactory](/TODO)。| 否，默认使用druid.peon.defaultSegmentWriteOutMediumFactory

#### IndexSpec
属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
bitmap | JSON | 位图索引的压缩格式。详情看看下面 | 否，默认Concise
dimensionCompression | 字符串 | 维度的压缩格式，有LZ4, LZF, uncompressed(不压缩) | 否，默认LZ4
metricCompression | 字符串 | 指标的压缩格式，有LZ4, LZF, uncompressed(不压缩), none | 否，默认LZ4
longEncoding | 字符串 | 维度和指标中整型类型的编码格式，有auto或者longs。auto根据列上值的基数使用位移或者维度表编码，和不固定的大小来存储；long使用8 bytes来存储 | 否，默认longs

##### 位图类型
###### Concise位图:

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 必须是concise | 是

###### Roaring位图

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 必须是roaring | 是
compressRunOnSerialization | 布尔值 | 运行时预估长度来编码，更好的空间使用效率 | 否，默认true

### KafkaSupervisorIOConfig
属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
topic | 字符串 | Kafka topic。必须是特定的topic，不支持模式匹配 | 是
consumerProperties | Map | 传到Kafka消费者的属性。必须包含一个正确的`bootstrap.servers`：Kafka的broker地址列表，用`<BROKER_1>:<PORT_1>,<BROKER_2>:<PORT_2>,...`表示 | 是
replicas | 整数 | 副本数，1表示单个任务集(没有副本)。副本任务通常分别到不同的工作节点，提供弹性容错 | 否，默认1
taskCount | 整数 | 一个副本集最大的任务数。表示最多有`taskCount x replicas`个读数据任务和所有任务的数量(读+发布)会比这个大。详情请看下面的`容量计划`。如果`taskCount < numKafkaPartitions`，读数据任务数据就会比`taskCount`小 | 否，默认1
taskDuration | ISO8601 | 任务从开始到停止读取，开始发布segment的时长。注意只有当索引任务完成，segment才会被发布到深度存储和被historical节点加载。| 否，默认PT1H
startDelay | ISO8601 | supervisor开始管理任务之前最长等待时长 | 否，默认PT5S
period | ISO8601 | supervisor执行管理逻辑的间隔。注意supervisor也会给某些事件响应(例如任务成功、失败或者达到`taskDuration`)，因此这个值指定了迭代之间的时长 | 否，默认PT30S
useEarliestOffset | 布尔型 | 如果supervisor第一次管理这个datasource, 他会从Kafka收到一堆偏移量。这里决定了是取最早还是最晚的偏移量。一般情况下，任务会从上一个segment的结束开始，所以这里一般只有在第一次有效。| 否，默认false
completionTimeout | ISO8601 | 定义一个发布任务超时失败和停止他的最长等待时长。如果设的太短，任务可能一直发布不成功。几时会严格从taskDuration到达之后算起。| 否，默认PT30M
lateMessageRejectionPeriod | ISO8601 | 丢弃掉比任务创建时间往前的一定时长的事件。例如这里设为`PT1H`，supervisor在`2016-01-01T12:00Z`创建的任务，所以早于`2016-01-01T11:00Z`的消息会被丢弃掉。这会帮助预防了一些并发问题，如果数据有一些很早的数据，并且有多个操作相同segment的工作流水线(例如一个实时和一个凌晨执行的导入任务)。| 否，default none
earlyMessageRejectionPeriod | ISO8601 | 丢弃掉比任务执行时间到达`taskDuration`之后一定时长的时间。例如这里设为`PT1H`，`taskDuration`设为`PT1H`，supervisor在`2016-01-01T12:00Z`创建任务，那么晚于`2016-01-01T14:00Z`的事件会被丢弃的 | 否，默认none
skipOffsetGaps | 布尔型 | 是否允许Kafka数据流缺失偏移量的间隔。这些需要实现的兼容，例如MapR Streams是不保证偏移量连续的。如果设置为false，不连续的偏移量会抛出错误 | 否，默认false

### Supervisor API
下面提到的API，都在Overlord上可用。

#### 创建Supervisor
```
POST /druid/indexer/v1/supervisor
```
使用`Content-Type: application/json`和在请求中提供一个supervisor配置。

如果在相同datasource上已经有一个supervisor在运行，调用这个API会导致：
- 正在运行的supervisor通知他管理的所有任务停止读取数据，开始发布segment。
- 正在运行的supervisor停止运行
- 根据请求中带的配置创建一个新的supervisor。这个supervisor会保留当前正在发布的任务，然后创建新的任务，从这个发布任务的结束偏移量开始读取数据。

因此使用这个API提交新结构就可以实现无缝的结构迁移。

#### 关停Supervisor
```
POST /druid/indexer/v1/supervisor/<supervisorId>/shutdown
```
注意这个会导致所有这个supervisor管理的索引任务立刻停止，开始发布segment。

#### 获取Supervisor ID
```
GET /druid/indexer/v1/supervisor
```
返回当前活跃的所有supervisors的id

#### 获取Supervisor配置
```
GET /druid/indexer/v1/supervisor/<supervisorId>
```
返回指定supervisor的配置

#### 获取Supervisor状态报告
```
GET /druid/indexer/v1/supervisor/<supervisorId>/status
```
返回指定supervisor下任务当前状态的一个快照。内容包括Kafka的偏移量，每个消费者分区的延迟，和所有分区延迟的总和。单个分区的延迟可能是一个负数，如果supervisor没有从Kafka那收到一个最近的偏移量反馈。延迟的总和就总会>=0。

#### 或者所有Supervisor的历史
```
GET /druid/indexer/v1/supervisor/history
```
或者所有supervisor(当前和过去的)的一个(`audit`)历史配置

#### 获取Supervisor的历史
```
GET /druid/indexer/v1/supervisor/<supervisorId>/history
```
获取指定supervisor的一个(`audit`)历史配置

#### 重置Supervisor
```
POST /druid/indexer/v1/supervisor/<supervisorId>/reset
```
索引任务一直跟踪最新的已经持久化的Kafka偏移量，以提供任务之间的`exactly-once`导入保证。后续任务必须从前任务完成的位置开始读取，以新生成的segment能够被接受。如果预期开始偏移量上的消息在Kafka不再有效(一般是因为消息过期，或者topic被删除和重建)，supervisor不会启动，新建的task也会失败。

这个API用于清除保存的偏移量，导致supervisor会从最新或者最早(取决于`useEarliestOffset`)的偏移量读取。supervisor必须在运行时API才会有效。保存的偏移量完成清除之后，supervisor会自动删掉和重新创建目前活跃的任务，从新的有效偏移量开始读取数据。

注意因为保存的偏移量对于保证`exactly-once`导入是必须的，重置他们可以会导致一些Kafka消息被跳过或者读取两次。

### 容量计划
Kafka索引服务运行在middle managers，因此受限于middle manager集群的资源。一般，你需要保证说你有足够的工作者容量(通过配置`druid.worker.capacity`)来处理supervisor的配置。注意所有类型的索引任务共用这个工作者容量，因此你要计划好以便正常处理你的所有索引加载任务(例如批处理进程，实时任务，合并任务等等)。如果容量被使用完，Kafka索引认为会排队等待下一个可用的工作者。这可能会导致查询到部分的结果，但是不会导致数据丢失(假设这个任务都是在Kafka清洗这些偏移量之前运行)。

一个正在运行的任务通常会有两种状态：读取或者发布。任务会在`taskDuration`到达之前一直处于读取状态，到点后转为发布状态。然后一直保持发布状态直到segment生成推送到深度存储，被historical成功加载(或者直到`completionTimeout`到达)。

读取状态的任务数据有`replicas`和`taskCount`决定。一般情况下总共会有`replicas x taskCount`个读取任务，除非`taskCount > numKafkaPartitions`，此时就只有`numKafkaPartitions`个任务。当`taskDuration`到达，这些任务会转到发布状态，然后又有`replicas x taskCount`个新的读取任务创建。因此如果允许读取任何和发布任务并行执行，至少需要的容量为：
```
workerCapacity = 2 * replicas * taskCount
```
这个值适用于理想情况，就是最多只有一组发布任务，和一组读取任务。有些情况是多个发布任务同时执行，当发布的时间(segment生成，推送到深度存储到historical节点加载)大于`taskDuration`。这是一个正常的场景但是需要额外的容量来支持。一般情况下，设置`taskDuration`足够大，使得前一组能在当前读取任务组完成之前发布完成。

### Supervisor持久性
当一个supervisor配置通过`POST /druid/indexer/v1/supervisor`API提交，他会持久化到配置的元数据数据库。每个datasource只有唯一一个supervisor，提交第二个会覆盖掉原来的那个。

当一个overlord称为主节点，通过启动或者另外一个overlord失败了，他会在元数据数据库给每一个supervisor配置创建一个supervisor。此时supervisor找到运行的的Kafka索引任务，如果双方配置兼容，supervisor就会尝试托管他们。如果因为不同的导入配置或者分区分配的原因他们不兼容，任务会被杀掉，然后新的supervisor会重新创一个任务组。这样的方法下，supervisor得以在overlord重启或失败重启中保持持久性。

supervisor通过`POST /druid/indexer/v1/supervisor/<supervisorId>/shutdown`API关闭。这会在数据库中放上一个逻辑删除标记(防止supervisor重启时重新加载)，然后正常关系当前运行的supervisor。以这种方式关闭的supervisor，他会指示他管理的的任务停止去读，然后开始发布segment。当所有任务正常停止了在发布之前，API就会返回结果。

### 结构/配置更改
结构和配置的更改通过提交新的supervisor配置到与创建同样的API`POST /druid/indexer/v1/supervisor`。overlord会正常关闭现有的supervisor，管理的任务也会停止读取，开始发布segment。之后一个新的supervisor启动，创建新的任务组，使用新的结构并且从之前的正在发布的任务的偏移量开始读取数据。基于这样的方案配置的修改就不需要暂停导入了。

### 开发笔记
#### segment讨论
每个Kafka索引任务消费Kafka分区的事件然后根据segment粒度推送至一个单独的segment直到行数达到了`maxRowsPerSegment`，然后又创建一个新的segment分区接收之后的事件。Kafka索引任务使用增量handoffs，意思是说直到任务时长到达之前segment都不会被保留。当行数达到了`maxRowsPerSegment`，segment会立马执行hand-off，然后创建一批新的segment接收新的event。这意味着任务可以运行足够长的时间，因为不需要在Middle Manager节点本地合并旧的的segment。因此我们推荐这么做。

Kafka索引服务可能会持续产生一些小segment。例如任务时长4小时，segment粒度设为`HOUR`，Supervisor在0:10开始，那么4个小时后的13:10，新的任务会开始启动，那么时间段13:00 - 14:00就可以分在不同的任务组里了。如果你觉得这是一个问题，那么可以安排重新索引的任务来合并segment到一个理想的大小(大概每个semgnet 500-700M)。还有一些正在进行的工作，在不需要Hadoop的情况下支持分片的segment自动压缩(详情请看[这里](https://github.com/druid-io/druid/pull/5102))

