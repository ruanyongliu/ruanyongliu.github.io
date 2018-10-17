
Druid旨在部署为一个可扩展、容错的集群。  
在这个文档，我们会安装一个简单的集群，讨论如何根据你的需求做进一步的配置。这个简单的集群会给Historical和MiddleManager提供可扩展、容错的服务，以及一个单点coordination服务器来管理Coordinator和Overlord进程。对于线上环境，我们建议Coordinator和Overlord也部署到可容错的容器上。

### 硬件
Coordinator和Overlord可以一起部署在一个单点服务器，负责处理集群的元数据和coordination需求。亚马逊[m3.xlarge](https://aws.amazon.com/ec2/instance-types/#M3)同等配置的足以满足大多集群。这个硬件提供:
- 4 vCPUs
- 15 GB 内存
- 80 GB SSD 存储


Historical and MiddleManager可以一起部署在一个单点服务器，处理集群的实际数据。这些机器受益于CPU、内存和SSD硬盘。亚马逊[r3.2xlarge](https://aws.amazon.com/ec2/instance-types/#r3)同等配置是个很好的起点。这个硬件提供:
- 8 vCPUs
- 61 GB 内存
- 160 GB SSD 存储

Druid Broker接受查询请求，然后分配给集群其他的节点。他也会选择性地在内存维护一个查询缓存。这些服务收益于CPU和内存，因此也可以部署在亚马逊[r3.2xlarge](https://aws.amazon.com/ec2/instance-types/#r3)同等配置的硬件。这个硬件提供:
- 8 vCPUs
- 61 GB 内存
- 160 GB SSD 存储

你可以考虑把一些开源的查询UI或者查询库部署在Broker运行的服务器上。  
非常大的集群需要考虑选择更大的服务器。

### 系统
我们建议运行你喜欢的Linux发布版本。此外你需要：
- Java 8

如果你的Ubuntu-based系统Java版本过低，可以使用WebUpd8提供的[安装包](http://www.webupd8.org/2012/09/install-oracle-java-8-in-ubuntu-via-ppa.html)。

### 下载发行版
首先下载并解压发布存放。最好是现在一台机器上操作，因为你需要修改配置，然后将修改后的发行版复制到所有服务器上。
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

这里我们需要改动`conf/`内的文件。


### 配置深度存储
Druid依赖一个分布式文件系统或者一个大型对象(blob)存储作为数据存储。最常用于深度存储实现的是S3(适用于亚马逊的那些)和HDFS(适用于你已经有一个Hadoop系统)。
#### S3
修改`conf/druid/_common/common.runtime.properties`:
- 设置`druid.extensions.loadList=["druid-s3-extensions"]`。
- 注释掉深度存储和indexing服务日志使用本地存储的配置。
- 去掉深度存储和indexing服务日志在`For S3`一节的注释，并配置正确的值。

下面是一个例子
```
druid.extensions.loadList=["druid-s3-extensions"]

#druid.storage.type=local
#druid.storage.storageDirectory=var/druid/segments

druid.storage.type=s3
druid.storage.bucket=your-bucket
druid.storage.baseKey=druid/segments
druid.s3.accessKey=...
druid.s3.secretKey=...

#druid.indexer.logs.type=file
#druid.indexer.logs.directory=var/druid/indexing-logs

druid.indexer.logs.type=s3
druid.indexer.logs.s3Bucket=your-bucket
druid.indexer.logs.s3Prefix=druid/indexing-logs
```
#### HDFS
修改`conf/druid/_common/common.runtime.properties`：
- 设置`druid.extensions.loadList=["druid-hdfs-storage"]`。
- 注释掉深度存储和indexing服务日志使用本地存储的配置。
- 去掉深度存储和indexing服务日志在`For HDFS`一节的注释，并配置正确的值。

下面是一个例子：
```
druid.extensions.loadList=["druid-hdfs-storage"]

#druid.storage.type=local
#druid.storage.storageDirectory=var/druid/segments

druid.storage.type=hdfs
druid.storage.storageDirectory=/druid/segments

#druid.indexer.logs.type=file
#druid.indexer.logs.directory=var/druid/indexing-logs

druid.indexer.logs.type=hdfs
druid.indexer.logs.directory=/druid/indexing-logs
```
还有，
- 把Hadoop的那些XML配置文件(`core-site.xml`, `hdfs-site.xml`, `yarn-site.xml`, `mapred-site.xml`)放在Druid节点的运行目录。例如你可以把这些文件复制到`conf/druid/_common/`。

#### 配置Tranquility服务(可选)
数据流可以通过Tranquility服务提供的一个简单的HTTP API发送到Druid。如果你使用到这个功能，则需要[配置Tranquility服务](/TODO)。
#### 配置Tranquility Kafka(可选)
Druid可以通过Tranquility Kafka消费Kafka数据流。如果你使用这个功能，则需要[配置Tranquility Kafka](/TODO)。
#### 配置连接到Hadoop(可选)
如果你需要从一个Hadoop集群加载数据，你需要配置Druid来发现你的集群：
- 修改`conf/middleManager/runtime.properties`的`druid.indexer.task.hadoopWorkingPath`为用于在indexing过程中存在临时文件的HDFS地址，例`druid.indexer.task.hadoopWorkingPath=/tmp/druid-indexing`。
- 把Hadoop的那些XML配置文件(`core-site.xml`, `hdfs-site.xml`, `yarn-site.xml`, `mapred-site.xml`)放在Druid节点的运行目录。例如你可以把这些文件复制到`conf/druid/_common/core-site.xml`，`conf/druid/_common/hdfs-site.xml`等等。

注意你不一定需要使用HDFS深度存储，及时是从Hadoop加载数据。例如你的集群本来就运行在亚马逊Web服务，我们仍然推荐你使用S3作为深度存储，及时你使用Hadoop或者Elastic MapReduce来加载数据。

更多的信息请浏览[批量导入](/TODO)

### 配置Druid coordination服务的地址
在这个简单的集群，我们会部署一个单点Druid Coordinator，一个单点Druid Overlord，一个单点Zookeeper实例，和一个嵌入式Derby元数据存储在同一台服务器上。
修改`conf/druid/_common/common.runtime.properties`，更改`zk.service.host`为运行ZK实例的机器地址：
- `druid.zk.service.host`

修改`conf/druid/_common/common.runtime.properties`, 修改`metadata.storage.*`为你用来作为元数据存储的机器地址：
- `druid.metadata.storage.connector.connectURI`
- `druid.metadata.storage.connector.host`

<div class="alert alert-warning" role="alert">
我们推荐线上系统使用2台服务器各部署一个Coordinator和一个Overlord。推荐部署一个Zookeeper集群在专用硬件上。推荐备份的元数据存储，如MySQL或者PostgreSQL，在专用硬件上。
</div>

### 调整用于处理查询的进程
Historical和MiddleManager可以部署在相同的硬件上。这些进程受益于调整到他们运行的硬件上。如果你使用Tranquility服务或者Kafka，你还可以把Tranquility服务与这两个进程一起部署。如果你使用[r3.2xlarge](https://aws.amazon.com/ec2/instance-types/#r3)EC2实例或者相似的硬件，发行版的配置是一个合理起点。  
如果你使用的是不同的硬件，我们推荐你根据你的硬件调整配置。  
一些常调整的配置有:
- `-Xmx`和`-Xms`
- `druid.server.http.numThreads`
- `druid.processing.buffer.sizeBytes`
- `druid.processing.numThreads`
- `druid.query.groupBy.maxIntermediateRows`
- `druid.query.groupBy.maxResults`
- Historical节点的`druid.server.maxSize`和`druid.segmentCache.locations`
- MiddleManagers的`druid.worker.capacity`

<div class="alert alert-info" role="alert">
保证 -XX:MaxDirectMemory >= numThreads\*sizeBytes，否则Druid就启动不了。
</div>

[Druid配置文档](/TODO)完整地描述了所有可能的配置选项。

### 调整Druid Broker
Druid Broker同样受益于调整他们运行的硬件。如果你使用[r3.2xlarge](https://aws.amazon.com/ec2/instance-types/#r3)EC2实例或者相似的硬件，发行版的配置是一个合理起点。  
如果你使用的是不同的硬件，我们推荐你根据你的硬件调整配置。  
一些常调整的配置有:

- `-Xmx`和`-Xms`
- `druid.server.http.numThreads`
- `druid.cache.sizeInBytes`
- `druid.processing.buffer.sizeBytes`
- `druid.processing.numThreads`
- `druid.query.groupBy.maxIntermediateRows`
- `druid.query.groupBy.maxResults`

<div class="alert alert-warning" role="alert">
保证 -XX:MaxDirectMemory >= numThreads\*sizeBytes，否则Druid就启动不了。
</div>

[Druid配置文档](/TODO)完整地描述了所有可能的配置选项。

### 开放端口(如果使用防火墙)
如果你使用了防火墙，或者其他限制端口流量的系统，需要开放下列端口用于内部连接：

端口 | 用途
----|----
1527 | Coordinator的Derby数据库。如果使用的是分离的元数据存储如MySQL或者PostgreSQL则不需要
2181 | ZooKeeper；如果使用一个分离的ZooKeeper集群则不需要
8081 | Coordinator
8082 | Broker
8083 | Historical
8084 | 独立的Realtime，如果使用了
8088 | Router, 如果使用了
8090 | Overlord
8091, 8100–8199 | MiddleManager; 如果druid.worker.capacity很大，可能还需要开通比8199更大的端口
8200 | Tranquility服务, 如果使用了

<div class="alert alert-warning" role="alert">
线上系统我们推荐分别给ZooKeeper和元数据存储部署在专用的硬件上，而不是跟Coordinator服务一起。
</div>

### 启动Coordinator, Overlord, Zookeeper和元数据存储
复制Druid发行版和修改后的配置到你的coordination服务器。如果你已经在你本地机器修改过配置，可以使用`rsync`复制他们
```
rsync -az druid-0.12.3/ COORDINATION_SERVER:druid-0.12.3/
```
登录到你的coordination服务器，安装Zookeeper
```
curl http://www.gtlib.gatech.edu/pub/apache/zookeeper/zookeeper-3.4.11/zookeeper-3.4.11.tar.gz -o zookeeper-3.4.11.tar.gz
tar -xzf zookeeper-3.4.11.tar.gz
cd zookeeper-3.4.11
cp conf/zoo_sample.cfg conf/zoo.cfg
./bin/zkServer.sh start
```

<div class="alert alert-warning" role="alert">
线上系统我们推荐运行ZooKeeper在专用的硬件上。
</div>

在你的coordination服务器，`cd`到发行版目录，启动这些coordination服务。(你应该在不同的窗口上运行，或者把日志导向到一个文件)
```
java `cat conf/druid/coordinator/jvm.config | xargs` -cp conf/druid/_common:conf/druid/coordinator:lib/* io.druid.cli.Main server coordinator
java `cat conf/druid/overlord/jvm.config | xargs` -cp conf/druid/_common:conf/druid/overlord:lib/* io.druid.cli.Main server overlord
```
每一个启动的服务你应该都会看见一条日志信息打印出来。你也可以在其他终端查看`var/log/druid`目录来查看所有服务的详细
日志。
### 启动Historical和MiddleManager
复制Druid发行版和修改后的配置到用于部署Historical和MiddleManager的机器。
在每一台机器，`cd`到发行版目录，执行下面命令，启动一个数据服务：
```
java `cat conf/druid/historical/jvm.config | xargs` -cp conf/druid/_common:conf/druid/historical:lib/* io.druid.cli.Main server historical
java `cat conf/druid/middleManager/jvm.config | xargs` -cp conf/druid/_common:conf/druid/middleManager:lib/* io.druid.cli.Main server middleManager
```
你可以按需来添加更多的Historical和MiddleManager。

<div class="alert alert-info" role="alert">
对于更复杂的资源分配需求，你可以把Historical和MiddleManager分开存储，单独扩展。也允许你利用Druid自带的MiddleManager自动扩展功能。
</div>

如果你正在使用Kafka或者HTTP进行基于推送的数据流导入，你可是在托管Historical和MiddleManager的机器上启动Tranquility服务。对于更大规模的线上系统，MiddleManager和Tranquility仍然可以一起部署。如果你使用一个流处理器运行Tranquility(非服务器), 你可以把流处理器和Tranquility部署在一起，而不需要Tranquility服务器。
```
curl -O http://static.druid.io/tranquility/releases/tranquility-distribution-0.8.0.tgz
tar -xzf tranquility-distribution-0.8.0.tgz
cd tranquility-distribution-0.8.0
bin/tranquility <server or kafka> -configFile <path_to_druid_distro>/conf/tranquility/<server or kafka>.json
```
### 启动 Druid Broker
复制Druid发行版和修改后的配置到用于部署Broker的机器。
在每一台机器，`cd`到发行版目录，执行下面命令，启动一个Broker(你可能需要把输出导到一个日志文件)：
```
java `cat conf/druid/broker/jvm.config | xargs` -cp conf/druid/_common:conf/druid/broker:lib/* io.druid.cli.Main server broker
```
你可以按查询的量来添加更多的Broker。

### 加载数据
恭喜，你已经有一个Druid集群了！下一步就是学习基于你的使用场景来加载数据的一些推荐的方法。详情请阅读[加载数据](#!/ingestion)
