Firehose在[本地批量导入任务](/TODO)，[Tranquility](/TODO)自动创建的流式推送任务，和[流式拉取(已废弃)]导入模型中使用。

他们是可插拔的，因此配置结果可以根据firehose的类型`type`而变化

配置项 | 类型 | 描述 | 必须
---- | ---- | ---- | ----
type | 字符串 | 指定firehose的类型。每一个类型值都有其特定的配置结构，下面介绍Druid打包的firehose | 是

### 更多的Firehose
Druid里有好几种firehose可供使用，有的作为例子，有的可以直接在生产环境上使用。
更多的firehose，请阅读[扩展列表](/TODO)

#### 本地Firehose
firehose读取本地硬盘的数据文件。可以用于POC(What it is?)来从硬盘导入数据。下面是一个本地firehose配置样例:
```
{
    "type"    : "local",
    "filter"   : "*.csv",
    "baseDir"  : "/data/directory"
}
```

配置项 | 描述 | 必须
---- | ---- | ----
type | 这里必须是`local` | 是
filter | 文件名过滤，[详情](http://commons.apache.org/proper/commons-io/apidocs/org/apache/commons/io/filefilter/WildcardFileFilter.html) | 是
baseDir | 导入的数据文件根目录，文件会被层层递归搜索 | 是

#### Http Firehose
firehose通过HTTP读取远端的数据，配置样例:
```
{
    "type"    : "http",
    "uris"  : ["http://example.com/uri1", "http://example2.com/uri2"]
}
```
下面的可选配置用于调整firehose的性能。

配置项 | 描述 | 默认值
---- | ---- | ----
maxCacheCapacityBytes | cache最大的空间大小。0表示不使用cache。cache在导入任务之前不会被删除 | 1073741824
maxFetchCapacityBytes | 存在预先抓取数据的最大的空间大小。0表示不预先抓取。预先抓取的文件在被真实读入后被立即删除 | 1073741824
prefetchTriggerBytes | 触发抓取http内容的上线 | maxFetchCapacityBytes / 2
fetchTimeout | 抓取http内容的时限(毫秒) | 60000
maxFetchRetry | 抓取http内容最多尝试次数 | 3

#### segment导入Firehose
firehose读取现有的druid segment来读取数据。用来导入现有的segment，但是使用新结构，新的名称、维度、指标、rollup选项等等。配置样例:
```
{
    "type"    : "ingestSegment",
    "dataSource"   : "wikipedia",
    "interval" : "2013-01-01/2013-01-02"
}
```

配置项 | 描述 | 必须
---- | ---- | ----
type | 这里必须是`ingestSegment` | 是
dataSource | 抓取来源数据的datasource，概念类似于关系数据库的表(table) | 是
interval | `ISO-8601`格式的表示时间段的字符串。定义要抓取的数据的时间范围 | 是
dimensions | 要抓取的维度。空的dimensions意味着不抓取维度，null或者不定义表示抓取所有维度 | 否
metrics | 要抓取的指标，空表示不抓取。null或者不定义表示抓取所有 | 否
filter | 请阅读[filter] | 否

#### 合并Firehose
合并一组不同firehose读取的数据。因此可以用来合并一组以上的firehose。
```
{
    "type"  :   "combining",
    "delegates" : [ { firehose1 }, { firehose2 }, ..... ]
}
```

配置项 | 描述 | 必须
---- | ---- | ----
type | 这里必须是`combining` | 是
delegates | 合并数据的firehose | 是


#### 流式Firehose
因为不适合批量导入，只用于[流式拉取(已废弃)](/TODO)导入模型。
`EventReceiverFirehose`也只用于[Tranquility流式推送](/TODO)自动创建的任务。

##### 时间接收Firehose
`EventReceiverFirehoseFactory`使用一个Http服务来导入事件。
```
{
  "type": "receiver",
  "serviceName": "eventReceiverServiceName",
  "bufferSize": 10000
}
```
使用这个firehose, 事件可以通过提交一个POST请求到一个http服务：

`http://<peonHost>:<port>/druid/worker/v1/chat/<eventReceiverServiceName>/push-events/`

配置项 | 描述 | 必须
---- | ---- | ----
type | 这里必须是`receiver` | 是
serviceName | 事件接受服务的名称 | 是
bufferSize | firehose保存事件的缓冲区大小 | 否，默认`100000`

可以通过提交POST请求来指定EventReceiverFirehose的关闭时间

`http://<peonHost>:<port>/druid/worker/v1/chat/<eventReceiverServiceName>/shutdown?shutoffTime=<shutoffTime>`

如果`shutOffTime`没有指定，firehose会立刻关闭

##### 指定结束时间Firehose
启动一个在指定时间关闭的firehose，样例如下:
```
{
    "type"  :   "timed",
    "shutoffTime": "2015-08-25T01:26:05.119Z",
    "delegate": {
          "type": "receiver",
          "serviceName": "eventReceiverServiceName",
          "bufferSize": 100000
     }
}
```
配置项 | 描述 | 必须
---- | ---- | ----
type | 这里必须是`timed` | 是
shutoffTime | firehose的关闭时间ISO8601格式 | 是
delegate | 使用的firehose | 是

