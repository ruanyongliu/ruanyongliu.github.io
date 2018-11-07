Druid使用Tranquility(一个Druid的客户端)或者Kafka索引服务来导入流式数据。

### Tranquility(流推送)
如果你有一个产生数据流的程序，然后你就可以实时直接地推送数据到Druid。使用这种方法，Tranquility需要嵌入到你的数据生产应用中。Tranquility附带绑定了Storm和Samza数据流处理器，也提供给基于JVM的程序如Spark Streaming或者一个Kafka consumer直接的API。

Tranquility负责分区，备份，服务发现和架构翻转，无缝地并且不需要停机。你需要做的只有定义的Druid结构。

更多Tranquility的样例和信息，请阅读[Tranquility README](https://github.com/druid-io/tranquility)

也可以阅读[教程：通过HTTP推送加载流式数据](#!/tutorials/tutorial-tranquility)

### Kafka索引服务(流式拉取)
Druid使用Kakfa索引服务从kafka流拉取数据。

Kafka索引服务可以在Overlord配置supervisor，通过管理Kakfa索引任务的创建和其生命周期来从Kafka完成导入。这个索引任务使用kafka原生的分区和偏移机制来读取事件，因此可以提供精确一次`exactly-once`的导入。他们还可以读取过去的事件，不受像其他导入机制那样的时间窗口限制。supervisor负责监督索引任务的状态，协调切换，管理错误，确保扩展和备份需求可维护。

请阅读[教程：从Kakfa加载流式数据](#!/tutorials/tutorial-kafka)

