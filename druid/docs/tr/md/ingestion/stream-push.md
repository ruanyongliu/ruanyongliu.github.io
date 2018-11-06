Druid可以通过[Tranquility](https://github.com/druid-io/tranquility/blob/master/README.md)——一个实时实时推送数据到Druid的工具包连接任意的流式数据源。Druid原生不附带Tranquility，你需要额外下载发行版。

<div class="alert alert-info" role="alert">
如果你之前没有尝试过通过Tranquility加载数据，我们建议你先阅读相关的[流式数据加载教程](#!/tutorials/tutorial-tranquility)再回来。
</div>

注意无论选择什么样的流式导入，你必须保证输入的数据足够新(落在一个可配置的当前时间窗口)。旧的消息不会被处理。历史数据最好还是通过[批处理导入方式](#!/ingestion/batch-ingestion)处理。

### 服务
Druid可以直接使用[Tranquility服务](https://github.com/druid-io/tranquility/blob/master/docs/server.md)，而不需要再发布一个JVM应用来发送数据。你可以把服务和middleManagers、historical进程部署在一起。

启动Tranquility服务:
```
bin/tranquility server -configFile <path_to_config_file>/server.json
```
配置Tranquility服务:
- 修改`server.json`设置`properties`和`dataSources`
- 如果已经有Tranquility服务在运行, 停掉他(CTRL-C)然后再重启启动

配置`server.json`的详情，请看[教程：编写一个导入配置](#!/tutorials/tutorial-ingestion-spec)和[Tranquility服务文档](https://github.com/druid-io/tranquility/blob/master/docs/server.md)

### JVM应用和流处理器
Tranquility也可以嵌套在基于JVM的应用依赖库里。你可以直接在你的程序里使用[核心API](https://github.com/druid-io/tranquility/blob/master/docs/core.md)，或者使用Tranquility附带的专门对接比较流行的流式处理器如[Storm](https://github.com/druid-io/tranquility/blob/master/docs/storm.md)、[Samza](https://github.com/druid-io/tranquility/blob/master/docs/samza.md)、[Spark Streaming](https://github.com/druid-io/tranquility/blob/master/docs/spark.md)、[Flank](https://github.com/druid-io/tranquility/blob/master/docs/flink.md)等的连接器。

#### Kafka (已废弃)
<div class="alert alert-info" role="alert">
Tranquility Kafka接口已经废弃了，对接Kafka请使用Kafka索引服务。
</div>

[Tranquility Kafka](https://github.com/druid-io/tranquility/blob/master/docs/kafka.md)让你在不用编写额外代码的情况下实现从Kafka加载数据。而只需要提供一个配置文件。

启动命令:
```
bin/tranquility kafka -configFile <path_to_config_file>/kafka.json
```

单机配置:
- 修改`kafka.json`设置`properties`和`dataSources`
- 如果已经有Tranquility服务在运行, 停掉他(CTRL-C)然后再重启启动

配置`kafka.json`的详情，请看[Tranquility Kafka文档](https://github.com/druid-io/tranquility/blob/master/docs/kafka.md)

### 概念
#### 任务创建
Tranquility自动创建Druid实时索引任务，负责处理分区，备份，服务发现和架构翻转，无缝地并且不需要停机。你无需写代码来直接单独处理这些任务，但是了解Tranquility如何创建任务对你有帮助。

Tranquility定期启动一些相对短暂的任务，各自处理一小部分[Druid segment](#!/design/segment)。Tranquility通过ZooKeeper协调这个任务。你可以使用相同配置启动尽量多的Tranquility实例，即使在不同的机器上，他们也会发送到同一组任务。

查看[Tranquility总览](https://github.com/druid-io/tranquility/blob/master/docs/overview.md)关于更多Tranquility管理任务的详情。

#### segment的粒度和时间窗口
segment粒度是任务生成segment的时间范围。例如`hour`表示任务会每个小时创建对应的segment。

时间窗口是事件允许的时间范围。例如10分钟(默认值)的时间窗口表示10分钟前的或者10分钟之后的事件都会被略过。

这都是很重要的配置，因为他们影响到任务的生命周期，和决定数据在提交到historical节点之前要在实时系统呆多久。例如你的配置是segment粒度为`hour`和10分钟的时间窗口，任务就会一直监听事件持续1个小时10分钟。因此为了防止过多的任务累计，建议设置时间窗口比segment粒度小。

#### 只追加
Druid流式导入只能追加，也就是说你不能使用流式导入来更新或者删除单独的记录。如果你需要更新或者删除，你需要使用一个批处理重新索引的进程。详情请看[批量导入](#!/ingestion/batch-ingestion)。

Druid支持在不需要重新索引的情况下有效删除整段时间数据。通过设置过期规则来自动完成。

#### 数据保证
Tranquility基于一个best-effort设计。意思是说在时间区间内通过设置复制和错误重试他尽可能保留你的数据，但是不保证事件只处理一次。在一些情况下你可以扔掉或者复制时间:
- 时间窗口外的事件会被略过
- 如果错误的Druid Middle Manager数量比配置的副本多，一部分数据可能会丢失。
- 如果与Druid索引服务的通信一直中断，并且重试数量已经用完，或者中断持续比时间窗口长，一些事件被可能会丢弃。
- 如果Tranquility收不到kakfa索引服务的应答，会发生重试，因此导致一些事件被复制。
- 如果你在Storm或者Samza使用Tranquility，多个架构各自的至少一次`at-least-once`设计可能会导致事件复制。

大多数情况下风险是很小的。但是如果历史数据你需要100%的准确性，推荐下面提到的批量/流式混合架构。

#### 批量/流式混合
你可以是用批量/流式混合架构来合并批量和流式导入方法。在混合架构中，你使用一个流式导入来做初步的导入，然后定期把历史数据用批量模型重新导入一次(一般在几个小时之后，或者第二天凌晨)，当重新导入的数据有一阵了，就自动替换掉较早之前导入的那一份了。

所有Druid支持的流式导入方案都有在某些错误场景下数据被丢弃或者被复制的可能性，批量重新导入清除了历史数据这些潜在的错误数据源。

批量重新导入还满足你因为一些原因需要重新导入数据的需求。

### 文档
[Tranquility文档](https://github.com/druid-io/tranquility/blob/master/README.md)

### 配置
[Tranquility配置](https://github.com/druid-io/tranquility/blob/master/docs/configuration.md)

[Tranquility tuningConfig](http://static.druid.io/tranquility/api/latest/#com.metamx.tranquility.druid.DruidTuning)
