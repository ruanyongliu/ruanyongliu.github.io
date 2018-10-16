### Datasources and segments
Druid数据保存在"datasource"，类似于传统关系型数据库的表(Table)。每个datasource按时间分割，也可以按更多的属性来分割。每段时间被称为一个chunk(例如一天，如果你的datasource按天分割的话)。一个chunk里的数据被分为一到多个的segment。每个segment是一个单独的文件，一般包含数百万行数据。由于segment按时间组织，可以想象segment是如下安排在一个时间轴上的：
![](http://druid.io/docs/img/druid-timeline.png)

一个datasource可以由少至几个，多至数百数千甚至几百万个segment组成。每个segment刚被MiddleManager创建之时，是可修改和未提交的状态。这些segment的生成包括三个步骤，来保证创建的文件是紧凑的，并且支持快速查询：
- 转化成列存储
- 利用位图索引够构建索引
- 多种压缩算法:
  - 对于字符串使用id存储最小化的字典编码
  - 对于位图索引使用位图压缩
  - 所有列使用Type-aware压缩

segment会周期第进行提交和生成。这个时候他们会写到深度存储，变成不能修改，从Historical进程移到MiddleManagers进程。segment的记录也更新到元数据存储。这个记录描述segment的结构、大小和在深度存储的坐标。这些记录是告诉Coordinator进程数据在集群的哪里。

更详细的segment文件描述，请访问[segment文件](/TODO)

#### Segment 标识符
segment标识符分为4个部分，分别是：
- Datasource名称。
- 时间段 (包含这个segment的时间块，对应导入时间指定的粒度)
- 版本号 (通常是一个ISO8601格式的时间戳，对应段集合第一次创建的时间)
- 分区号 (一个整数，对于`datasource + 时间段 + 版本号`唯一，可能不是连续的)

下面是一个datasource为`clarity-cloud0`, 时间块`2018-05-21T16:00:00.000Z/2018-05-21T17:00:00.000Z`, 版本号`2018-05-21T15:56:09.909Z`, 分区号`1`的例子
```
clarity-cloud0_2018-05-21T16:00:00.000Z_2018-05-21T17:00:00.000Z_2018-05-21T15:56:09.909Z_1
```

分区号为`0`的segment省略分区号，如下面例子，与上面例子是一个时间块，但是分区号是`0`而不是`1`
```
clarity-cloud0_2018-05-21T16:00:00.000Z_2018-05-21T17:00:00.000Z_2018-05-21T15:56:09.909Z
```

#### Segment 版本
你可能很想知道上段中所提到的`版本号`是什么。如果不是，你可以跳过本段！  
这个版本号是用于支持批量重写的。在Druid，如果你一直只添加数据，对于每个时间块只有一个版本。但是当你重写数据时，一个新的，有着相同datasource，相同时间段和一个更高版本号的segment集合就会被创建。这会给Druid系统信号说旧版本的segment需要从集群删除，使用新版本数据替代掉。  
对一个用户来说，这个转换似乎是瞬间发生的，Druid在第一次加载新数据时开始处理(但还不能被查询)，然后当所有数据被加载完，新的查询就会转换到这些新的segment。然后在数分钟之后删掉旧的segment。

#### Segment 状态
segment可以是可用(available)或者不可用的，指的是他们是否由某个进程提供服务。他们也可以是被发布(published)和未发布的，指的是他们是否已经写到深度存储和更新到元数据存储。发布的segment可以是可以使用(used)和不可以使用的，指的是Druid是否认为它们是应该被服务的活跃segment。  
总结起来，segment可以归结为下面5种状态:
- **发布的，可用的，可以使用的**：segment已经发布到深存储和元数据存储，由Historical进程提供服务。它们是一个Druid集群主要的活跃数据(它们包含了除了正在导入的实时数据外的一切)
- **发布的，可用的，不可使用的**：segment由Historical提供服务，但不会太久。它们可能是刚被重写(详情看segment版本)或者其他原因被删除(例如一些删除规则，或手动删除)
- **发布的，不可用，可以使用的**：segment已经发布到深存储和元数据存储，但没被服务的。如果segment处在这个状态好几分钟了，通常就是有问题发生。一些常见的问题包括：大量的Historical失败，Historical无法下载更多的segment，以及Coordinator一些协调问题无法告诉Historical去加载新segment
- **发布的，不可用，不可使用的**：segment已经发布到深存储和元数据存储，但是不活跃(被重新活删除了)。他们处于休眠状态，需要的话可以手动复活(特别地：将使用状态设为可以使用)
- **未发布的，可用的**：segment还在被Druid导入任务创建中。这里包括了所有实时的还没被Historical处理的数据。这个状态的segment可能有或者没有被复制。如果所有副本被丢弃了，segment需要从导入源重新创建。这是可以或不可以的(Kafka是可以，并且自动的；S3/HDFS可以通过重新启动作业；Tranquility是不可以的，这种情况下数据就会被丢失)

第六种状态是**未发布和不可用**，这是不存在的。未发布的且不能被处理，那它真的存在?  

#### Indexing & Handoff
indexing是segment的创建机制，handoff是segment发布到Historical机制。indexing端工作机制如下:
1. 一个新的indexing任务开始运行，创建一个新的segment。并且必须在创建前决定标识符。对于追加数据的任务(如Kafka、或追加模式的index任务)，他会通过调用Overload进程的`allocate`API潜在地在现有的segment集合添加一个的分区。对于一个重写任务(如Hadoop任务，或者不是追加模式的index)，他会通过在时间段上加锁，然后创建一个新的版本号和一个新的segment集合。
2. 如果是一个实时indexing任务(如Kafka)，segment是可以立即被查询的。他是可用但未发布的。
3. 当indexing任务完成给segment读入数据之后，推送至深度存储，添加新记录到元数据存储来发布。
4. 最后，如果是一个实时indexing任务，他会等来Historical进程加载segment，否则segment会立刻存在。

Coordinator / Historical端的工作机制:
1. Coordinator轮询元数据存储(默认每分钟)去获取新发布segment信息。
2. 当Coordinator发现一个发布的可以使用的但不可用的，选择一个Historical进程通知这个进程去加载他。
3. Historical加载新segment并且开始服务。
4. 关闭正在等待handoff的indexing服务。

### 导入方法
对于大部分导入方法，导入是在MiddleManager节点完成的。一个例外就是基于Hadoop的导入，是通过一个运行在Yarn的Hadoop MapReduce作业完成的(虽然MiddleManager会参与启动和监控Hadoop作业)。  
一旦segment被生成和写进深度存储，他就会被Druid的Historical节点加载。一些Druid导入方法支持实时查询，意思就是你可以查询刚刚被导入还没被写进深度存储的实时数据。一般对比Historical节点的大量数据相比，MiddleManager会有少量数据处于运行中。  
更详细的Druid如何对数据存储和管理的描述，请阅读[Druid简介](#!/design)  
下表列举了Druid常见的数据导入方法，通过比较可以帮你选择最好的方法:

方法 | 工作方式 | 追加或重写? | 能否处理过去的数据 | 数据只插入一次? | 实时查询?
----|----|----|----|----|----
[本地批处理](/TODO) | 直接通过S3/HTTP/NFS或其他网络存储加载数据 | 追加和重写 | 是 | 是 | 否
Hadoop | 启动一个Hadoop MapReduce作业 | 追加或重写 | 是 | 是 | 否
Kafka indexing服务 | 通过Kafka | 只能追加 | 是 | 是 | 是
Tranquility | Tranquility，一个客户端，向Druid推送数据 | 只能追加 | 丢弃过期数据 | 丢失或重复写 | 是

### 分区
Druid是一个分布式数据存储，通过分区数据来并行处理数据。datasource通常先按导入时设定的时间粒度来分区。每个时间分区称为一个块，一个时间块包含一到多个segment。一个块上的segment再根据导入设定上更多的维度来继续分区。  
- 使用[Hadoop](/TODO)可以对一列进行hash或者按范围来分区
- 使用本地批处理你可以根据所有维度列的一个hash进行分区。当roll-up可用是这是有用的，因为它能最大限度节省你的空间。
- 使用Kafka indexing，分区固定是基于Kafka的分区并且不能配置。你可以在Kafka的生产者端进行配置。
- 使用Tranquility，分区默认使用在所有维度列的一个hash以达到最大的Roll-up。你可以提供一个自定义的Partitioner class。详情请看[Tranquility文档](/TODO)

### 汇总 Rollup
Druid在导入时使用一个进程，称为`roll-up`，来汇总原始数据。Roll-up是一个作用在维度集合之上的顶级的聚合操作，聚合一个指标集合。  
假设我们有一下原始数据，表示在一对节点之间若干秒内的流量统计。`srcIP`和`dstIP`属于维度，`packets`和`byets`属于指标。
```
timestamp                 srcIP         dstIP          packets     bytes
2018-01-01T01:01:35Z      1.1.1.1       2.2.2.2            100      1000
2018-01-01T01:01:51Z      1.1.1.1       2.2.2.2            200      2000
2018-01-01T01:01:59Z      1.1.1.1       2.2.2.2            300      3000
2018-01-01T01:02:14Z      1.1.1.1       2.2.2.2            400      4000
2018-01-01T01:02:29Z      1.1.1.1       2.2.2.2            500      5000
2018-01-01T01:03:29Z      1.1.1.1       2.2.2.2            600      6000
2018-01-02T21:33:14Z      7.7.7.7       8.8.8.8            100      1000
2018-01-02T21:33:45Z      7.7.7.7       8.8.8.8            200      2000
2018-01-02T21:35:45Z      7.7.7.7       8.8.8.8            300      3000
```
如果我们导入数据的粒度设为分钟(时间被格式化至分钟)，roll-up操作相当于下面的伪代码：
```
GROUP BY TRUNCATE(timestamp, MINUTE), srcIP, dstIP :: SUM(packets), SUM(bytes)
```
数据在roll-up操作之后，会以下面的形式被导入：
```
timestamp                 srcIP         dstIP          packets     bytes
2018-01-01T01:01:00Z      1.1.1.1       2.2.2.2            600      6000
2018-01-01T01:02:00Z      1.1.1.1       2.2.2.2            900      9000
2018-01-01T01:03:00Z      1.1.1.1       2.2.2.2            600      6000
2018-01-02T21:33:00Z      7.7.7.7       8.8.8.8            300      3000
2018-01-02T21:35:00Z      7.7.7.7       8.8.8.8            300      3000
```
Druid汇总数据来减少数据的存储量。经过试验，我们发现数据量在汇总之后有显著性的减少(超过100倍)。这样减少的后果：由于我们汇总了数据，就无法查询单独的事件。  
汇总的粒度是最小的可浏览的数据粒度，事件也被格式化这个粒度。因此Druid导入配置定义了查询粒度。最小支持的粒度是毫秒。  
下面的链接可能对维度和指标更进一步的认识有帮助：
- [Dimension_(data_warehouse)](https://en.wikipedia.org/wiki/Dimension_%28data_warehouse%29)
- [Measure_(data_warehouse)](https://en.wikipedia.org/wiki/Measure_%28data_warehouse%29)

#### Roll-up 模式
Druid支持两种roll-up模式，完美roll-up和尽力roll-up。在完美roll-up模式，Druid保证数据在导入时完全聚合。作为对比，尽力roll-up模式下，数据可能不会完全聚合，因此结果可能会有若干segment包含应该属于在完美聚合下相同的行，因为他们具有相同的维度，时间也落在同一个时间段上。  
完美roll-up模式包括了额外的预处理步骤，以便如果ingestionSpec没有指定，在数据导入之前也能确定时间段和shardSpecs。预处理步骤通常会扫描整个输入数据，因此会增加导入时间。Hadoop indexing任务通常使用完美roll-up模式。  
相反，尽力roll-up模式不需要任何预处理步骤，但是导入数据集大小会比完美roll-up大。所有的流式indexing(如Kafka indexing)使用这种模式。  
最后，本地index任务支持两种模式，你可以根据你的应该选择合适的方案。

### 数据维护
#### 添加和重写
Druid可以通过在现有segment集合创建新的segment来添加新数据。也可以通过合并现有的segment合并或者重写原来的集合。  
Druid不支持通过一个主键更新单条记录。  
更详细的"更新"描述，请查看[更新现有数据](/TODO)
#### 压缩
压缩是一类重写操作，通过读取现有的segment集合，合并成一个每个segment更大，但数量更少的新集合，然后覆盖原来的集合，而不用改写数据。  
一些性能关系的原因，压缩是有益的，因为导入和查询都有一些轮询每个segment的处理和内存开销。  
更多的压缩文档，请浏览[压缩](/TODO)
#### 保留和分层
Druid支持保留规则，用于定义哪些时间段的数据应该保留，哪些应该被丢弃。  
Druid也支持对historical节点分层，保留规则可以针对不同的层指定不同的时间段。  
这个特性对性能/开销管理非常有效；一个常用的分层方案是`热`层和`冷`层。  
详情请参考[加载规则](/TODO)
#### 删除
Druid支持对不可使用的状态进行永久删除(参考上面的Segment状态)。  
kill任务删除掉深度存储和元数据存储上指定的不可使用的segment。  
详情请参考[kill任务](/TODO)  

