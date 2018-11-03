通过一个Hadoop导入任务，支持基于Hadoop的批量导入。这类任务发布到一个[Druid overlord进程](#!/design/overlord)的运行实例。

### 命令行Hadoop Indexer
如果你不想用一个完整的indexing服务来使用Hadoop导入数据，你也可以用一个独立的命令行Hadoop indexer。详情请看[这里](#!/ingestion/command-line-hadoop-indexer)。

### 配置语法
```
{
  "type" : "index_hadoop",
  "spec" : {
    "dataSchema" : {
      "dataSource" : "wikipedia",
      "parser" : {
        "type" : "hadoopyString",
        "parseSpec" : {
          "format" : "json",
          "timestampSpec" : {
            "column" : "timestamp",
            "format" : "auto"
          },
          "dimensionsSpec" : {
            "dimensions": ["page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city"],
            "dimensionExclusions" : [],
            "spatialDimensions" : []
          }
        }
      },
      "metricsSpec" : [
        {
          "type" : "count",
          "name" : "count"
        },
        {
          "type" : "doubleSum",
          "name" : "added",
          "fieldName" : "added"
        },
        {
          "type" : "doubleSum",
          "name" : "deleted",
          "fieldName" : "deleted"
        },
        {
          "type" : "doubleSum",
          "name" : "delta",
          "fieldName" : "delta"
        }
      ],
      "granularitySpec" : {
        "type" : "uniform",
        "segmentGranularity" : "DAY",
        "queryGranularity" : "NONE",
        "intervals" : [ "2013-08-31/2013-09-01" ]
      }
    },
    "ioConfig" : {
      "type" : "hadoop",
      "inputSpec" : {
        "type" : "static",
        "paths" : "/MyDirectory/example/wikipedia_data.json"
      }
    },
    "tuningConfig" : {
      "type": "hadoop"
    }
  },
  "hadoopDependencyCoordinates": <my_hadoop_version>
}
```

属性 | 描述 | 必须？
---- | ---- | ----
type | 这里必须是`index_hadoop` | 是
spec | 配置主题，详情请看[导入配置](#!/ingestion/ingestion-spec) | 是
hadoopDependencyCoordinates | Druid使用的Hadoop依赖，用JSON数组表示。配置会覆盖掉默认的依赖。一旦声明了，Druid会在 `druid.extensions.hadoopDependencyCoordinates` 目录查到这些依赖 | 否
classpathPrefix | 加至peon进程的classpath的开头 | 否

还有要注意的是druid回自动加载运行在hadoop集群的作业的classpath。但是对于hadoop和druid依赖冲突的情况，你可以通过设置 `druid.extensions.hadoopContainerDruidClasspath`来手动声明classpath。详情请看[基本druid的扩展配置](/TODO)。

### DataSchema
必须，请看[导入配置DataSchema](#!/ingestion/ingestion-spec#dataschema)

### IOConfig

属性 | 类型 | 描述 | 必须？
---- | ---- | ---- | ----
type | 字符串 | 这里必须是`hadoop` | 是
inputSpec | JSON | 数据来源 | 是
segmentOutputPath | 字符串 | segment导出路径 | 是
metadataUpdateSpec | JSON | druid集群更新元数据的方式 | 只能用于[命令行Hadoop Indexer](#!/ingestion/command-line-hadoop-indexer), 其他这里只能是null

#### InputSpec
有多种类型的配置，包括:
##### static
静态的文件

属性 | 类型 | 描述 | 必须？
---- | ---- | ---- | ----
paths | 字符串数组 | 文件路径 | 是

例如:
```
"paths" : "s3n://billy-bucket/the/data/is/here/data.gz,s3n://billy-bucket/the/data/is/here/moredata.gz,s3n://billy-bucket/the/data/is/here/evenmoredata.gz"
```

##### granularity
适合数据按照时间来组成目录，格式：`y=XXXX/m=XX/d=XX/H=XX/M=XX/S=XX`(日期小写时间大写)

属性 | 类型 | 描述 | 必须？
---- | ---- | ---- | ----
dataGranularity | 字符串 | 时间粒度，例如`hour`表示期望的目录是`y=XXXX/m=XX/d=XX/H=XX` | 是
inputPath | 字符串 | 基本路径，再加上时间路径能确定最终路径 | 是
filePattern | 字符串 | 包含的文件的文件名格式 | 是
pathFormat | 字符串 | 目录的Joda时间格式，默认`'y'=yyyy/'m'=MM/'d'=dd/'H'=HH`，请看[Joda文档](http://www.joda.org/joda-time/apidocs/org/joda/time/format/DateTimeFormat.html) | 否

例如，如果样例配置运行在时间段"2012-06-01/2012-06-02"的，预期的数据路径:
```
s3n://billy-bucket/the/data/is/here/y=2012/m=06/d=01/H=00
s3n://billy-bucket/the/data/is/here/y=2012/m=06/d=01/H=01
...
s3n://billy-bucket/the/data/is/here/y=2012/m=06/d=01/H=23
```

##### dataSource
请看[这里](#!/ingestion/update-existing-data)

##### multi
请看[这里](#!/ingestion/update-existing-data)

### TuningConfig

属性 | 类型 | 描述 | 必须？| 默认
---- | ---- | ---- | ---- | ----
workingPath | 字符串 | 临时结果的工作路径(Hadoop作业之间的结果) | 只能用于[命令行Hadoop Indexer](#!/ingestion/command-line-hadoop-indexer) | /tmp/druid-indexing
version | 字符串 | 创建的segment的版本号，除非`useExplicitVersion`设为`true`，否则HadoopIndexTask会忽略这个配置 | 否 | indexing服务开始的时间
partitionsSpec | JSON | 定义怎么分割每个时间桶到segment。不指定表示不分区。详情请看下方**分区配置** | 否 | hashed
maxRowsInMemory | 整数 | 持久化前的数据行数，由于rollup这个行数不一定等于输入数据的行数。这个配置用来控制JVM堆内存空间 | 否 | 75,000
leaveIntermediate | 布尔型 | 作业完成后，无论成功与否，中间文件(可用于调试)是否保留 | 否 | false
cleanupOnFailure | 布尔型 | 作业失败后中间文件是否清楚(除非`leaveIntermediate`打开) | 否 | true
overwriteFiles | 布尔型 | 作业创建的文件如果已经存在是否覆盖 | 否 | false
ignoreInvalidRows | 布尔型 | 是否忽略有问题的行 | 否 | false
combineText | 布尔型 | 使用`CombineTextInputFormat`合并多个文件到一个新文件，可对加速那种操作多个小文件的hadoop作业 | 否 | false
useCombiner | 布尔型 | Mapper阶段是否使用Combiner | 否 | false
jobProperties | JSON | 添加到Hadoop作业配置，详情请看下面 | 否 | 
indexSpec | JSON | 调整输入导入方式，详情请看下面 | 否 |
numBackgroundPersistThreads | 整数 | 用于incremental持久化模型中的后台线程数量。会带来显著的内存和cpu使用量，但也会使作业完成得更快。0表示使用当前线程来持久化，我们推荐设置为1 | 否 | 0
forceExtendableShardSpecs | 布尔型 | 强制使用 `extendable` 的 `shardSpecs` 配置。旨在与[Kafka indexing服务扩展](/TODO)一起使用的实验功能。| 否 | false
useExplicitVersion | 布尔型 | 强制HadoopIndexTask使用版本号 | 否 | false

#### jobProperties
```
  "tuningConfig" : {
     "type": "hadoop",
     "jobProperties": {
       "<hadoop-property-a>": "<value-a>",
       "<hadoop-property-b>": "<value-b>"
     }
   }
```
Hadoop的[MapReduce文档](https://hadoop.apache.org/docs/stable/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)列举了一些可用的配置参数。  
一些Hadoop发行版可能需要设置 `mapreduce.job.classpath` 或者 `mapreduce.job.user.classpath.first` 来排除类加载问题。详情请看[如何在不同的Hadoop版本的环境工作](/TODO)

#### IndexSpec

属性 | 类型 | 描述 | 默认
---- | ---- | ---- | ----
bitmap | JSON | 位图索引的压缩格式。详情看看下面 | Concise
dimensionCompression | 字符串 | 维度的压缩格式，有LZ4, LZF, uncompressed(不压缩) | LZ4
metricCompression | 字符串 | 指标的压缩格式，有LZ4, LZF, uncompressed(不压缩), none | LZ4
longEncoding | 字符串 | 维度和指标中整型类型的编码格式，有auto或者longs。auto根据列上值的基数使用位移或者维度表编码，和不固定的大小来存储；long使用8 bytes来存储 | longs

#### 位图类型
##### Concise位图:

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 必须是concise | 是

##### Roaring位图

属性 | 类型 | 描述 | 必须?
---- | ---- | ---- | ----
type | 字符串 | 必须是roaring | 是
compressRunOnSerialization | 布尔值 | 运行时预估长度来编码，更好的空间使用效率 | 否，默认true

### 分区配置
segment通常基于时间戳(根据`granularitySpec`)来分区，也可以根据类型做进一步的分区。Druid支持两种类型的分区策略：
- **hashed**，基于每一行所有维度一起的hash
- **dimension**，基于某单个维度的范围

大多情况下推荐hashed分区，相比单个维度的分区策略，hashed分区能提升indexing的效率和创建更多统一大小的segment。

#### 基于hash的分区
```
  "partitionsSpec": {
     "type": "hashed",
     "targetPartitionSize": 5000000
   }
```
hashed分区首先选择一个segment数量，然后每一个根据所有维度的hash值来分配。segment数量基于数据集的大小和一个目标分区数量来确定。  
配置选项:

属性 | 描述 | 必须?
---- | ---- | ----
type | partitionSpec的类型 | 这里必须是hashed
targetPartitionSize | 每个分区的目标数据行数，应该按照segment在500M~1G的大小来设置 | 与 `numShards` 两者选一
numShards | 直接设置分区数量，而不是分区大小。导入过程会跟快，因为他会跳过自动选择一个分区数量的步骤 | 与 `targetPartitionSize` 两者选一
partitionDimensions | 选择用于hash的维度，默认选择所有。只在 `numShards` 有用，`targetPartitionSize` 会忽略这个设置 | 否

#### 单个维度分区
```
  "partitionsSpec": {
     "type": "dimension",
     "targetPartitionSize": 5000000
   }
```
单维度分区首先选择一个维度来确定分区，然后把这个维度分开成连续的多个区间。每个segment就包括了所有的这个维度落在对应区间的数据行。例如你的segment根据 `host` 维度分区，然后被分成 `a.example.com` 到 `f.example.com` 和 `f.example.com` 到 `z.example` 两个区间。默认情况下会自动选择一个列，或者你可以自定义来覆盖他。  
配置选项：

属性 | 描述 | 必须?
---- | ---- | ----
type | partitionSpec的类型 | 这里必须是dimension
targetPartitionSize | 每个分区的目标数据行数，应该按照segment在500M~1G的大小来设置 | 是
maxPartitionSize | 每个分区的最大数据行数，一般比 `maxPartitionSize` 大50% | 否
partitionDimensions | 选择用于hash的维度，默认选择所有。只在 `numShards` 有用，`targetPartitionSize` 会忽略这个设置 | 否
assumeGrouped | 假设数据已经按照时间和维度分组。导入效率会提高，但是跟假设有冲突会选择次优的分区 | 否

### 远端Hadoop集群
如果你有一个远端的Hadoop集群，请确保Druid的 `_common` 配置目录包含了集群的 `*.xml` 相关配置文件。  
如果你遇到了Hadoop版本和Druid版本之间的依赖问题，请查看[这个文档](/TODO)

### 使用弹性的MapReduce
如果你的集群运行在亚马逊Web服务，你可以在S3上使用弹性的MapReduce(EMR)来导入数据。你需要：
- 创建一个[持久的长时间运行的集群](http://docs.aws.amazon.com/ElasticMapReduce/latest/ManagementGuide/emr-plan-longrunning-transient.html)
- 输入下面的配置。如果你使用的wizard，这应该在 `Edit software settings` 下的高级模式 `advanced mode`
```
classification=yarn-site,properties=[mapreduce.reduce.memory.mb=6144,mapreduce.reduce.java.opts=-server -Xms2g -Xmx2g -Duser.timezone=UTC -Dfile.encoding=UTF-8 -XX:+PrintGCDetails -XX:+PrintGCTimeStamps,mapreduce.map.java.opts=758,mapreduce.map.java.opts=-server -Xms512m -Xmx512m -Duser.timezone=UTC -Dfile.encoding=UTF-8 -XX:+PrintGCDetails -XX:+PrintGCTimeStamps,mapreduce.task.timeout=1800000]
```
- 按照[配置Hadoop来加载数据](#!/tutorials/cluster#configure-cluster-for-hadoop-data-load)指导复制 `/etc/hadoop/conf` 下的XML文件到你的EMR

### 安全的Hadoop集群
默认情况下Druid可以使用在本地kerberos秘钥缓存里的可用的TGT kerberos票据。因为TGT票据生命周期有限制，你需要定期调用 `kinit` 命令来确保TGT票据的有效性。为了避免这个额外的cron脚本作业定期调用 `kinit`，你可以提供principal名称和keytab的目录，Druid会在启动和作业吊起时透明地进行身份验证。

属性 | 可能的值 | 描述 | 默认
---- | ---- | ---- | ----
druid.hadoop.security.kerberos.principal | druid@EXAMPLE.COM | Principal用户名 | 空
druid.hadoop.security.kerberos.keytab | /etc/security/keytabs/druid.headlessUser.keytab | keytab的文件路径 | 空

### 在S3使用EMR加载
在 `tuningConfig` 的 `jobProperties` 加上：
```
"jobProperties" : {
   "fs.s3.awsAccessKeyId" : "YOUR_ACCESS_KEY",
   "fs.s3.awsSecretAccessKey" : "YOUR_SECRET_KEY",
   "fs.s3.impl" : "org.apache.hadoop.fs.s3native.NativeS3FileSystem",
   "fs.s3n.awsAccessKeyId" : "YOUR_ACCESS_KEY",
   "fs.s3n.awsSecretAccessKey" : "YOUR_SECRET_KEY",
   "fs.s3n.impl" : "org.apache.hadoop.fs.s3native.NativeS3FileSystem",
   "io.compression.codecs" : "org.apache.hadoop.io.compress.GzipCodec,org.apache.hadoop.io.compress.DefaultCodec,org.apache.hadoop.io.compress.BZip2Codec,org.apache.hadoop.io.compress.SnappyCodec"
}
```

注意这里用的是Hadoop内置的S3文件系统，而不是亚马逊的EMRFS，也和Amazon特定的功能如S3加密和一致视图不兼容。如果你需要使用这些功能，你需要根据下面的文档的一个机制使得亚马逊的EMR Hadoop JAR包对于Druid可用。

### 使用其他Hadoop发行版
Druid可以在多种Hadoop发行版工作  
如果你在Druid和Hadoop版本之间出现依赖冲突，你可以试着在[Druid用户组](https://groups.google.com/forum/#!forum/druid-%0Auser)查询解决方法，或者阅读[不同的Hadoop版本文档](/TODO)。
