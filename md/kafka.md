Kafka是一款分布式发布-订阅消息系统，由LinkedIn开发，现在是Apache项目的一部分。常用于**构建实时流数据管道**，在程序之间可靠地获取数据。

首先，我们知：
* Kafka运行在一个集群上，集群分成多个brokers，每一个broker包含若干台机器
* 每条发布到Kafka的消息都有一个类别(topic)
* 每条消息包含一个key, 一个value和一个timestamp

然后，通过Kafka，我们可以：
* 使用**Producer(生产者) API**，发布消息流到一个或多个topic
* 使用**Consumer(消费者) API**，订阅并处理一个或多个topic的消息
* 使用**Streams API**，消费一个输入流，并发布到另一个新的输出流
* 使用**Connector API**，连接一个数据系统(如数据库)至一些topics，实时捕捉这个系统的数据变化

Kafka通过一个简单的、高可用的、语言无关的**TCP协议**连接使用这些API的客户端和Kafka服务端，这个协议是有版本的但保持向后兼容。

### 消息的存储：
&emsp;&emsp;Kafka集群用一个topic来表示一组已发布的消息流的名称或者说是类别。一般来说，一个topic会被一个或者多个Consumer订阅。

&emsp;&emsp;Kafka集群给每个topic维护着一组partition(如下图1)，一条消息只会被分配到其中的一个partition。一个partition内的这些消息按顺序地被添加进来，并分配一个id，实际是偏移量(offset), 不同partition的offset相互不影响。

![图1](http://upload-images.jianshu.io/upload_images/10223706-6ea9e75b6c2eb00c.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

(图1 | copy from 官网)


&emsp;&emsp;Kafka集群会保存所有消息一定的时间，只有当当前的时间比消息上的timestamp超过一定的时长，消息才会被删除，而不是消息是否被消费过。事实上，集群并不会记录消息的被消费情况，那是各个Consumer自己通过保存一个消费offset来记录的，所以集群并不知道消息是否被消费过。但是换个角度想，因为是Consumer自己保存offset，所以只要消息还没过期被删除，Consumer就可以随机读取，而不需要按顺序消费。

&emsp;&emsp;partitions保证了Kafka的高性能，一易于扩展，partition相互不影响，二增加并发能力。

&emsp;&emsp;Consumer自己保存offset的设计解耦了Kafka集群与Consumer，集群是无状态的，Consumer可以直接接入与离开，因为除了必要的拉取请求外，他基本不会影响到集群与其他Consumer。

&emsp;&emsp;物理存储上，每个partition对应一个逻辑日志，一个日志对应为一组大小相同的分段文件(如下图2)。每次一条消息被分布到一个partition上，Kafka会把消息追加到最后一个分段文件上，当追加到一定数量或者一段固定的时间后，文件会被写入磁盘。写完后，就可以公开到Consumer。

![图2 | copy from infoq](http://upload-images.jianshu.io/upload_images/10223706-a8892d8fe0757dc1.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

图2 | copy from infoq)


### 分布式
&emsp;&emsp;所有partition会分布在集群的不同broker节点上。每个partition又会被复制成多份分布在不同的broker节点上，其中一份充当这个partition的Leader节点，剩下的为Follower节点。一旦Leader宕机，会进行选举，从Follower选出新的Leader节点。

&emsp;&emsp;Leader维护了这个partition所有的可用Follower的列表，这个列表称为ISR。消息的发布只会通知到的Leader节点，Leader一旦写入日志，Follower就开始拉取进行复制，复制成功后发送ACK到Leader。一旦Follower落后Leader超过一定的延迟时间，Leader就会将这个Follower移除ISR。一条消息能被消费，必需要所有ISR的Follower都确认写入。

&emsp;&emsp;一般会结合使用ZooKeeper来实现节点间协调问题。

### 数据的保证
&emsp;&emsp;之前说过，一个topic会被分为多个partition存储在不同的broker，并且每个partition都会被复制一定数量的副本存储在另外的broker，所以系统是错误可容忍的。一旦一个机器出现了故障，结果无非是某些partition重新进行Leader选举，或者从ISR去除相应的Follower罢了。

&emsp;&emsp;消息从Producer发送到公开到Consumer期间这个过程，可以简单地分为两段——第一段：在内存中追加，落盘；第二段：Follower并行复制，通知到Consumer。那么如果Leader节点在第一段的过程中发生问题，如果配置了ACK，集群会向Producer客户端返回写失败；如果错误发生在第二段，会重新选举Leader，此时会选出已经复制最多的Follower作为新Leader，所以只要有一个Follower复制完成，数据仍然是完整的。因此只有在Leader节点写入磁盘、Follower节点都没有复制完成并且没有配置Follower确认ACK的情况下Leader节点宕机，数据才有可能出现丢失，总的来说Kafka的可靠性是非常高的！另外，Kafka不解决拜占庭问题。

&emsp;&emsp;Kafka的数据实际最终是存储在硬盘上的，但是借用文件系统的PageCache技术进行了优化。当然有可能存在PageCache领先硬盘的情况下发生宕机，但正如上面所说，只要有Follower节点，Kafka的数据是不怕丢的。

### 使用
&emsp;&emsp;在使用之前，一定要清楚是否满足业务需求，否则再好的性能也无用。举个简单的例子：Kafka是弱有序的，意思是说，只有在一个partition内消息是FIFO，如果从两个或以上的partition读取数据，顺序是不确定的，结果取决于partitions以及Consumers的状态。当然可以只设置一个partition来保证整体有序，牺牲性能来满足，但此时的Kafka就并没有什么优势可言了。

&emsp;&emsp;然后，如果你只是用Kafka来解耦一个小并发系统，那你几乎不用考虑任何特殊的配置了，Kafka在普通的机器上也能很好的工作，性价比非常高。

&emsp;&emsp;那么，在一个有一定并发量的系统上，可以稍微关注一下:
* num.partitions=1, 单个topic的partition数量。partition是决定Kafka系统并行能力的一个重要因素。partition要设多少，首先得满足：假设单个partition，Producer的吞吐量为p，Consumer的吞吐量为c，而整体期望的吞吐量为t，那么partition的数量至少为max(t/p, t/c)；其次，partition数量的增加，势必需要broker的数量增加来支持，那么在broker数量一定的情况下，partition就不能无限制的增加了，一般认为一个broker的partition最好不要超过100个。
* default.replication.factor=1, 每个partition的replica数量。replication机制保证了Kafka的可用性。replica数量不需要太多，在普通的机器上我觉得1~2个就够了。一来一个broker的partition最好控制在一定数量，replica的增加意味着partition就要减少；二来replica增加了Follower同步Leader数据的资源消耗。
* request.required.acks=0/1/-1，producer与broker的同步机制，数据健壮性和时延依次递增。0表示producer与broker不同步，如果在Follower复制成功之前Leader节点宕机，数据就丢失；1表示在Leader节点写入完毕后，broker向producer确认，那么如之前所说，如果Leader写入完毕，同时所有Follower都没有复制完成时Leader节点宕机，数据才会丢失；-1表示Follower节点也写入完毕后，broker向producer确认，此时数据不会丢失。机制的选择很大程度上依赖业务对各方面的SLA需求，在时延和数据健壮性上做权衡。

还有很多配置，这里也不一一详说了，大家可以上官网查询一下，选择最合适的方式来部署自己的Kafka集群。

###### 感谢大家的阅读，Kafka的介绍暂时到这里。文中不免有错的地方，欢迎指出。感谢！

