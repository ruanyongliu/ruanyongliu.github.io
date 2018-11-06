### 开始
本教程介绍如何使用Kafka索引服务从Kafka流加载数据。

我们假设你已经下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid服务。你暂不需要再加载任何数据

### 下载并安装Kafka
[Apache Kafka](http://kafka.apache.org/)是一个高吞吐消息通路，非常适合Druid。本章节我们使用Kafka 0.10.2.0。 下载Kafka，使用下面命令
```
curl -O https://archive.apache.org/dist/kafka/0.10.2.0/kafka_2.11-0.10.2.0.tgz
tar -xzf kafka_2.11-0.10.2.0.tgz
cd kafka_2.11-0.10.2.0
```

启动Kafka broker，执行命令：
```
./bin/kafka-server-start.sh config/server.properties
```

执行下面命令，创建一个topic，名为wikipedia，之后我们就往这个topic发送数据:
```
./bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic wikipedia
```

### 启动Druid Kafka导入
我们使用Druid的Kafka索引服务从刚新建的wikipedia topic导入数据。要启动服务，我们需要提交一个supervisor配置到Druid Overlord，在Druid目录的跟路径执行:
```
curl -XPOST -H'Content-Type: application/json' -d @examples/wikipedia-kafka-supervisor.json http://localhost:8090/druid/indexer/v1/supervisor
```

如果supervisor成功执行，我们会得到一个包含一个supervisorID的响应。针对这个例子我们应该能看到`{"id":"wikipedia-kafka"}`

更详细的描述，请浏览[Druid Kafka索引服务文档](/TODO)

### 加载数据
启动一个控制台发送一些数据

在你的Kafka目录，执行下面命令，其中`{PATH_TO_DRUID}`替代为你的Druid目录
```
export KAFKA_OPTS="-Dfile.encoding=UTF-8"
./bin/kafka-console-producer.sh --broker-list localhost:9092 --topic wikipedia < {PATH_TO_DRUID}/quickstart/wikiticker-2015-09-12-sampled.json
```
上述命令发送一些样例数据到wikipedia这个Kafka topic，然后数据就会通过Kafka索引服务导入到Druid。我们现在可以准备执行一些查询了！

### 查询数据
数据发送到Kafka流之后，就可以立即被查询。

请查看[查询教程](#!/tutorials/tutorial-query)来对新加载的数据执行一些查询。

### 清理
如果你希望继续其他导入教程，你需要[重置集群](#!/tutorials#resetting-cluster-state)，因为其他教程也会写到这个`wikipedia`datasource。

### 更多
更多从Kafka流导入数据的信息，请浏览[Druid Kafka索引服务文档](/TODO)

