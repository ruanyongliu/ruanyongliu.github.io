本教程将向你展示如何使用一个远端的Hadoop集群加载数据文件到Druid。

我们假设你已经完成上一章的批量导入教程：[使用本地批量导入系统](#!/tutorials/tutorial-batch)。

### 安装Docker
本教程要求在实验机器上安装使用[Docker](https://docs.docker.com/install/)。

完成Docker安装后，请继续阅读本教程。

### 创建Hadoop docker镜像
本教程，我们会提供一个Hadoop2.7.3集群的docker文件，用于运行批量索引任务。

Docker和相关文件保存在`examples/hadoop/docker`。

在`druid-0.12.3`目录，执行下面命令，创建一个名叫`druid-hadoop-demo`，带有一个版本标签`2.7.3`的Docker镜像:
```
cd examples/hadoop/docker
docker build -t druid-hadoop-demo:2.7.3 .
```
Hadoop镜像开始创建。一旦创建完成，你应该会在控制台上看到一条消息`Successfully tagged druid-hadoop-demo:2.7.3`。

### 设置Hadoop docker集群
#### 创建临时共享目录
我们需要一个共享的文件夹，用于在主机和Hadoop容器之间传输文件。

我们可以在`/tmp`下创建一些文件夹，在Hadoop容器启动后使用:
```
mkdir -p /tmp/shared
mkdir -p /tmp/shared/hadoop-xml
```
#### 配置/etc/hosts
在主机的/etc/hosts文件添加一行:
```
127.0.0.1 druid-hadoop-demo
```
#### 启动Hadoop容器
创建`/tmp/shared`文件夹和修改`/etc/hosts`之后，执行下面命令，启动Hadoop容器
```
docker run -it  -h druid-hadoop-demo --name druid-hadoop-demo -p 50010:50010 -p 50020:50020 -p 50075:50075 -p 50090:50090 -p 8020:8020 -p 10020:10020 -p 19888:19888 -p 8030:8030 -p 8031:8031 -p 8032:8032 -p 8033:8033 -p 8040:8040 -p 8042:8042 -p 8088:8088 -p 8443:8443 -p 2049:2049 -p 9000:9000 -p 49707:49707 -p 2122:2122  -p 34455:34455 -v /tmp/shared:/shared druid-hadoop-demo:2.7.3 /etc/bootstrap.sh -bash
```
容器启动后，你的终端会被连接到一个运行在容器内部的bash shell:
```
Starting sshd:                                             [  OK  ]
18/07/26 17:27:15 WARN util.NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable
Starting namenodes on [druid-hadoop-demo]
druid-hadoop-demo: starting namenode, logging to /usr/local/hadoop/logs/hadoop-root-namenode-druid-hadoop-demo.out
localhost: starting datanode, logging to /usr/local/hadoop/logs/hadoop-root-datanode-druid-hadoop-demo.out
Starting secondary namenodes [0.0.0.0]
0.0.0.0: starting secondarynamenode, logging to /usr/local/hadoop/logs/hadoop-root-secondarynamenode-druid-hadoop-demo.out
18/07/26 17:27:31 WARN util.NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable
starting yarn daemons
starting resourcemanager, logging to /usr/local/hadoop/logs/yarn--resourcemanager-druid-hadoop-demo.out
localhost: starting nodemanager, logging to /usr/local/hadoop/logs/yarn-root-nodemanager-druid-hadoop-demo.out
starting historyserver, logging to /usr/local/hadoop/logs/mapred--historyserver-druid-hadoop-demo.out
bash-4.1#
```
其中`Unable to load native-hadoop library for your platform... using builtin-java classes where applicable`信息可以忽略。
#### 访问Hadoop容器shell
打开Hadoop容器的新的shell，执行:
```
docker exec -it druid-hadoop-demo bash
```
#### 复制要导入的数据到Hadoop容器。
在主机`druid-0.12.3`目录，复制`quickstart/wikiticker-2015-09-12-sampled.json.gz`样例数据到共享文件夹
```
cp quickstart/wikiticker-2015-09-12-sampled.json.gz /tmp/shared/wikiticker-2015-09-12-sampled.json.gz
```
#### 设置HDFS目录
在Hadoop容器的shell执行下面命令，设置本教程需要的HDFS目录，复制导入的数据到HDFS
```
cd /usr/local/hadoop/bin
./hadoop fs -mkdir /druid
./hadoop fs -mkdir /druid/segments
./hadoop fs -mkdir /quickstart
./hadoop fs -chmod 777 /druid
./hadoop fs -chmod 777 /druid/segments
./hadoop fs -chmod 777 /quickstart
./hadoop fs -chmod -R 777 /tmp
./hadoop fs -chmod -R 777 /user
./hadoop fs -put /shared/wikiticker-2015-09-12-sampled.json.gz /quickstart/wikiticker-2015-09-12-sampled.json.gz
```
如果你收到namenode的错误，诸如```mkdir: Cannot create directory /druid. Name node is in safe mode.```，Hadoop容器此时还没有完成初始化。稍等若干分钟之后再尝试一次。

### 使用Hadoop配置Druid
还需要几个额外的步骤配置Druid使用Hadoop批量索引。
#### 复制Hadoop配置文件到Druid运行路径
在Hadoop容器的shell运行下面命令，复制Hadoop的.xml配置文件到共享文件夹:
```
cp /usr/local/hadoop/etc/hadoop/*.xml /shared/hadoop-xml
```
在主机之下下面命令，其中`{PATH_TO_DRUID}`用Druid的包路径替换:
```
cp /tmp/shared/hadoop-xml/*.xml {PATH_TO_DRUID}/examples/conf/druid/_common/hadoop-xml/
```
#### 更新Druid segment和日志存储
使用任何你喜欢的编辑器，打开`examples/conf/druid/_common/common.runtime.properties`, 进行如下修改:
##### 关闭本地深度存储，打开HDFS深度存储
```
#
# Deep storage
#

# For local disk (only viable in a cluster if this is a network mount):
#druid.storage.type=local
#druid.storage.storageDirectory=var/druid/segments

# For HDFS:
druid.storage.type=hdfs
druid.storage.storageDirectory=/druid/segments
```
##### 关闭本地日志存储，打开HDFS日志存储
```
#
# Indexing service logs
#

# For local disk (only viable in a cluster if this is a network mount):
#druid.indexer.logs.type=file
#druid.indexer.logs.directory=var/druid/indexing-logs

# For HDFS:
druid.indexer.logs.type=hdfs
druid.indexer.logs.directory=/druid/indexing-logs
```
#### 重启Druid集群
完成Hadoop .xml文件复制，修改segment和日志存储配置后，Druid集群需要重新来让新配置起作用。

如果集群还在执行，`CTRL-C`关闭每个Druid服务，再重新启动。

### 加载数据
我们已经给到一个2015年9月12日的维基编辑样例数据给你。

要加载这份数据给Druid，你可以提交一个指向这个文件的导入任务。要提交这个任务，在`druid-0.12.3`目录启动一个新Terminal，发送一个POST请求：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/wikipedia-index-hadoop.json http://localhost:8090/druid/indexer/v1/task
```
提供成功后会返回任务ID:
```
{"task":"index_hadoop_wikipedia-hadoop_2018-06-09T21:30:32.802Z"}
```
查看导入任务的状态，可以访问：http://localhost:8090/console.html 。你可以周期地刷新网页，任务成功之后，你应该能看见一个`SUCCESS`状态。

导入任务完成后，数据会被加载至historical节点，并且在一到两分钟后可被查询。你可以通过coordinator控制台监控加载数据的过程，检查是否wikipedia这个datasource，旁边有一个蓝圈表示为完全可用。

![](http://druid.io/docs/0.12.3/tutorials/img/tutorial-batch-01.png)

### 查询数据
一到两分钟之后你的数据应该能完全可用了。你可以通过Coordinator控制台http://localhost:8081/#/ 监控这个过程。

一旦数据加载完毕，请查看[查询教程](#!/tutorials/tutorial-query)来对新加载的数据执行一些查询。

### 清理
本教程仅用于与[查询教程](#!/tutorials/tutorial-query)一起使用。

如果你希望阅读其他教程，你需要
- 关闭集群、按照[重置教程](#!/tutorials#resetting-cluster-state)重置集群状态
- 深度存储和任务存储配置`examples/conf/druid/_common/common.runtime.properties`改回到本地类型
- 重启集群

这是必须的，因为其他教程也会写到这个`wikipedia`datasource，并且用的是本地深度存储。

一个退回配置样例:
```
#
# Deep storage
#

# For local disk (only viable in a cluster if this is a network mount):
druid.storage.type=local
druid.storage.storageDirectory=var/druid/segments

# For HDFS:
#druid.storage.type=hdfs
#druid.storage.storageDirectory=/druid/segments

#
# Indexing service logs
#

# For local disk (only viable in a cluster if this is a network mount):
druid.indexer.logs.type=file
druid.indexer.logs.directory=var/druid/indexing-logs

# For HDFS:
#druid.indexer.logs.type=hdfs
#druid.indexer.logs.directory=/druid/indexing-logs
```

### 更多
更多Hadoop批处理数据加载的信息，请浏览[Hadoop批处理导入教程](/TODO)

