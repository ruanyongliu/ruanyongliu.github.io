本章会介绍一个快速简单的单点方案，加载一些数据，并且进行查询。
### 前提
- Java 8+
- Linux, Mac OS X, 或者其他 Unix-like OS (不支持Windows)
- 8G内存
- 2 vCPUs

Mac OS X，可以使用[Oracle's JDK 8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)来安装Java

Linux的包管理工具应该会有帮助。如果是Ubuntu-based的系统，并且Java版本过低，可以使用WebUpd8提供的[安装包](http://www.webupd8.org/2012/09/install-oracle-java-8-in-ubuntu-via-ppa.html)

### 开始安装
安装Druid，在Terminal执行:
```
curl -O http://static.druid.io/artifacts/releases/druid-0.12.3-bin.tar.gz
tar -xzf druid-0.12.3-bin.tar.gz
cd druid-0.12.3
```
包里包含:
- `LICENSE` - 许可证文件
- `bin/` - 对quickstart有用的脚本
- `conf/*` - 集群模式安装的配置模板
- `conf-quickstart/*` - quickstart安装的配置模板
- `extensions/*` - 所有Druid扩展
- `hadoop-dependencies/*` - Druid Hadoop依赖
- `lib/*` - Druid核心需包含的软件包
- `quickstart/*` - quickstart有用的文件

### 下载教程用例文件
继续操作前，请下载[用例文件](http://druid.io/docs/0.12.3/tutorials/tutorial-examples.tar.gz)

安装包包含了样例数据和导入配置。
```
curl -O http://druid.io/docs/0.12.3/tutorials/tutorial-examples.tar.gz
tar zxvf tutorial-examples.tar.gz
```

### 启动ZooKeeper
Druid目前依赖[Apache ZooKeeper](http://zookeeper.apache.org/)来做分布式协调。你需要下载安装来启动。
```
curl http://www.gtlib.gatech.edu/pub/apache/zookeeper/zookeeper-3.4.10/zookeeper-3.4.10.tar.gz -o zookeeper-3.4.10.tar.gz
tar -xzf zookeeper-3.4.10.tar.gz
cd zookeeper-3.4.10
cp conf/zoo_sample.cfg conf/zoo.cfg
./bin/zkServer.sh start
```

### 启动Druid服务
Zookeeper启动后，返回`druid-0.12.3`目录。执行:
```
bin/init
```
这里会创建若干目录。接下来你可以在不同的terminal窗口分别启动Druid进程。这里会在一个系统内启动所有进程。如果在一个大的分布式线上集群，这些进程仍然可以一起合作进行。
```
java `cat examples/conf/druid/coordinator/jvm.config | xargs` -cp "examples/conf/druid/_common:examples/conf/druid/_common/hadoop-xml:examples/conf/druid/coordinator:lib/*" io.druid.cli.Main server coordinator
java `cat examples/conf/druid/overlord/jvm.config | xargs` -cp "examples/conf/druid/_common:examples/conf/druid/_common/hadoop-xml:examples/conf/druid/overlord:lib/*" io.druid.cli.Main server overlord
java `cat examples/conf/druid/historical/jvm.config | xargs` -cp "examples/conf/druid/_common:examples/conf/druid/_common/hadoop-xml:examples/conf/druid/historical:lib/*" io.druid.cli.Main server historical
java `cat examples/conf/druid/middleManager/jvm.config | xargs` -cp "examples/conf/druid/_common:examples/conf/druid/_common/hadoop-xml:examples/conf/druid/middleManager:lib/*" io.druid.cli.Main server middleManager
java `cat examples/conf/druid/broker/jvm.config | xargs` -cp "examples/conf/druid/_common:examples/conf/druid/_common/hadoop-xml:examples/conf/druid/broker:lib/*" io.druid.cli.Main server broker
```
一旦所有服务启动了，就可以开始加载数据了
#### <a id="resetting-cluster-state" class="anchor">重置Druid状态</a>
所有持久状态，如集群元数据存储和segment会保存在`druid-0.12.3`的`var`目录。

因此之后如果你想停掉服务，使用`Ctrl-C`关闭执行中的java进程。如果想重新启动一个干净的环境，删除`log`和`var`目录，执行`init`脚本，然后停掉Zookeeper，删除ZooKeeper的数据目录`/tmp/zookeeper`

在`druid-0.12.3`目录：
```
rm -rf log
rm -rf var
bin/init
```
如果你执行的是[教程:从Kafka加载流式数据](#!/tutorials/tutorial-kafka)，你应该在关掉Zookeeper之前关掉Kafka，然后删除Kafka日志目录`/tmp/kafka-logs`

`Ctrl-C`关闭kafka broker，然后删除目录:
```
rm -rf /tmp/kafka-logs
```

现在关闭ZooKeeper，清除状态。在`zookeeper-3.4.10`目录:
```
./bin/zkServer.sh stop
rm -rf /tmp/zookeeper
```
重置完Druid和Zookeeper状态，重启Zookeeper，然后重启Druid服务。

### 加载数据
接下来的数据加载教程，我们使用一个样例数据，包含2015-09-12当天维基页面的修改事件。

样例数据保存在Druid目录的`quickstart/wikiticker-2015-09-12-sampled.json.gz`。事件按json格式存储一个文本文件内。

样例数据包含以下列，例：
- added
- channel
- cityName
- comment
- countryIsoCode
- countryName
- deleted
- delta
- isAnonymous
- isMinor
- isNew
- isRobot
- isUnpatrolled
- metroCode
- namespace
- page
- regionIsoCode
- regionName
- user
```
{
  "timestamp":"2015-09-12T20:03:45.018Z",
  "channel":"#en.wikipedia",
  "namespace":"Main"
  "page":"Spider-Man's powers and equipment",
  "user":"foobar",
  "comment":"/* Artificial web-shooters */",
  "cityName":"New York",
  "regionName":"New York",
  "regionIsoCode":"NY",
  "countryName":"United States",
  "countryIsoCode":"US",
  "isAnonymous":false,
  "isNew":false,
  "isMinor":false,
  "isRobot":false,
  "isUnpatrolled":false,
  "added":99,
  "delta":99,
  "deleted":0,
}
```

接下来的教程阐述了多种Druid加载数据的方法，包括批处理和流式的情景：

#### [从文件加载](#!/tutorials/tutorial-batch)
从一个文件批处理加载，使用Druid内地批处理导入。
#### [从Kafka加载流式数据](#!/tutorials/tutorial-kafka)
从一个Kafka topic加载流式数据。
#### [使用Hadoop加载文件](#!/tutorials/tutorial-batch-hadoop)
从一个文件批处理加载，使用一个远端的Hadoop集群。
#### [使用Tranquility加载](#!/tutorials/tutorial-tranquility)
使用Tranquility服务加载流式数据推送至Druid。
#### [编写自己的导入配置](#!/tutorials/tutorial-ingestion-spec)
编写一个新的配置并使用它来加载数据
