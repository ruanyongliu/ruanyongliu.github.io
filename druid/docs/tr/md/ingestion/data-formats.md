Druid可以将导入JSON、CSV、或者分隔符形式的TSV或者其他自定义格式的非规范化数据。虽然文档大部分例子使用的JSON格式，配置Druid导入其他格式的数据也不难。我们欢迎更多的给新格式适配的贡献。

更多的数据格式，请阅读我们的[扩展列表](/TODO)。

### 格式化数据
下面展示Druid天然支持的数据格式:
##### JSON
```
{"timestamp": "2013-08-31T01:02:33Z", "page": "Gypsy Danger", "language" : "en", "user" : "nuclear", "unpatrolled" : "true", "newPage" : "true", "robot": "false", "anonymous": "false", "namespace":"article", "continent":"North America", "country":"United States", "region":"Bay Area", "city":"San Francisco", "added": 57, "deleted": 200, "delta": -143}
{"timestamp": "2013-08-31T03:32:45Z", "page": "Striker Eureka", "language" : "en", "user" : "speed", "unpatrolled" : "false", "newPage" : "true", "robot": "true", "anonymous": "false", "namespace":"wikipedia", "continent":"Australia", "country":"Australia", "region":"Cantebury", "city":"Syndey", "added": 459, "deleted": 129, "delta": 330}
{"timestamp": "2013-08-31T07:11:21Z", "page": "Cherno Alpha", "language" : "ru", "user" : "masterYi", "unpatrolled" : "false", "newPage" : "true", "robot": "true", "anonymous": "false", "namespace":"article", "continent":"Asia", "country":"Russia", "region":"Oblast", "city":"Moscow", "added": 123, "deleted": 12, "delta": 111}
{"timestamp": "2013-08-31T11:58:39Z", "page": "Crimson Typhoon", "language" : "zh", "user" : "triplets", "unpatrolled" : "true", "newPage" : "false", "robot": "true", "anonymous": "false", "namespace":"wikipedia", "continent":"Asia", "country":"China", "region":"Shanxi", "city":"Taiyuan", "added": 905, "deleted": 5, "delta": 900}
{"timestamp": "2013-08-31T12:41:27Z", "page": "Coyote Tango", "language" : "ja", "user" : "cancer", "unpatrolled" : "true", "newPage" : "false", "robot": "true", "anonymous": "false", "namespace":"wikipedia", "continent":"Asia", "country":"Japan", "region":"Kanto", "city":"Tokyo", "added": 1, "deleted": 10, "delta": -9}
```
##### CSV
```
2013-08-31T01:02:33Z,"Gypsy Danger","en","nuclear","true","true","false","false","article","North America","United States","Bay Area","San Francisco",57,200,-143
2013-08-31T03:32:45Z,"Striker Eureka","en","speed","false","true","true","false","wikipedia","Australia","Australia","Cantebury","Syndey",459,129,330
2013-08-31T07:11:21Z,"Cherno Alpha","ru","masterYi","false","true","true","false","article","Asia","Russia","Oblast","Moscow",123,12,111
2013-08-31T11:58:39Z,"Crimson Typhoon","zh","triplets","true","false","true","false","wikipedia","Asia","China","Shanxi","Taiyuan",905,5,900
2013-08-31T12:41:27Z,"Coyote Tango","ja","cancer","true","false","true","false","wikipedia","Asia","Japan","Kanto","Tokyo",1,10,-9
```
##### TSV (已经分割的)
```
2013-08-31T01:02:33Z    "Gypsy Danger"  "en"    "nuclear"   "true"  "true"  "false" "false" "article"   "North America" "United States" "Bay Area"  "San Francisco" 57  200 -143
2013-08-31T03:32:45Z    "Striker Eureka"    "en"    "speed" "false" "true"  "true"  "false" "wikipedia" "Australia" "Australia" "Cantebury" "Syndey"    459 129 330
2013-08-31T07:11:21Z    "Cherno Alpha"  "ru"    "masterYi"  "false" "true"  "true"  "false" "article"   "Asia"  "Russia"    "Oblast"    "Moscow"    123 12  111
2013-08-31T11:58:39Z    "Crimson Typhoon"   "zh"    "triplets"  "true"  "false" "true"  "false" "wikipedia" "Asia"  "China" "Shanxi"    "Taiyuan"   905 5   900
2013-08-31T12:41:27Z    "Coyote Tango"  "ja"    "cancer"    "true"  "false" "true"  "false" "wikipedia" "Asia"  "Japan" "Kanto" "Tokyo" 1   10  -9
```
注意CSV和TSV格式是没有列表头的，所以导入时的指定很重要。

### 自定义格式
Druid支持自定义的数据格式，然后使用正则或者JavaScript解析器解析。注意使用这些解析器会比自带的Java解析器或者外部的流处理器效率差。我们欢迎新解析器的贡献。

### 配置
所有形式的Druid导入都需要标明一些形式的schema。导入的数据格式指明在`dataSchema`的`parseSpec`选项。
#### JSON
```
  "parseSpec":{
    "format" : "json",
    "timestampSpec" : {
      "column" : "timestamp"
    },
    "dimensionSpec" : {
      "dimensions" : ["page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city"]
    }
  }
```
对于嵌套式的JSON，[Driuid可以自动地为你展开](/TODO)
#### CSV
```
  "parseSpec": {
    "format" : "csv",
    "timestampSpec" : {
      "column" : "timestamp"
    },
    "columns" : ["timestamp","page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city","added","deleted","delta"],
    "dimensionsSpec" : {
      "dimensions" : ["page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city"]
    }
  }
```
##### CSV索引任务
如果你的输入文件包含一个头部，`columns`项可以不用设。但是需要把`hasHeaderRow`设为`true`，此时Druid会自动地提取出列的信息。相反，你就需要设置`columns`并且保证能顺序上一一对应你的输入数据。

同时你也可以在`parseSpec`设置`skipHeaderRows`。如果同时设置了`skipHeaderRows`和`hasHeaderRow`，`skipHeaderRows`会先执行。例如，如果`skipHeaderRows`设为`2`，`hasHeaderRow`设为true，Druid会先略过头两行，然后在第三行提取出列的信息。

`hasHeaderRow`和`skipHeaderRows`只作用在非Hadoop批处理索引任务，否则会抛出异常。
##### 其他CSV导入任务
`columns`必须设置并且保证能顺序上一一对应你的输入数据。
#### TSV(分割的)
```
  "parseSpec": {
    "format" : "tsv",
    "timestampSpec" : {
      "column" : "timestamp"
    },
    "columns" : ["timestamp","page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city","added","deleted","delta"],
    "delimiter":"|",
    "dimensionsSpec" : {
      "dimensions" : ["page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city"]
    }
  }
```
根据你的数据填写正确`delimiter`。跟CSV类型，你必须指明`columns`和那些列你需要用作索引列(指明**维度**)。
##### TSV(分割的)索引任务
如果你的输入文件包含一个头部，`columns`项可以不用设。但是需要把`hasHeaderRow`设为`true`，此时Druid会自动地提取出列的信息。相反，你就需要设置`columns`并且保证能顺序上一一对应你的输入数据。

同时你也可以在`parseSpec`设置`skipHeaderRows`。如果同时设置了`skipHeaderRows`和`hasHeaderRow`，`skipHeaderRows`会先执行。例如，如果`skipHeaderRows`设为`2`，`hasHeaderRow`设为true，Druid会先略过头两行，然后在第三行提取出列的信息。

`hasHeaderRow`和`skipHeaderRows`只作用在非Hadoop批处理索引任务，否则会抛出异常。
##### 其他TSV(分割的)导入任务
`columns`必须设置并且保证能顺序上一一对应你的输入数据。
#### 正则
```
  "parseSpec":{
    "format" : "regex",
    "timestampSpec" : {
      "column" : "timestamp"
    },
    "dimensionsSpec" : {
      "dimensions" : [<your_list_of_dimensions>]
    },
    "columns" : [<your_columns_here>],
    "pattern" : <regex pattern for partitioning data>
  }
```
`columns`要跟你的正则表达式的groups顺序一致。默认是(`column_1`, `column_2`, ..., `column_n`)。`columns`必须包含`dimensions`里的所有值。
#### JavaScript
```
  "parseSpec":{
    "format" : "javascript",
    "timestampSpec" : {
      "column" : "timestamp"
    },
    "dimensionsSpec" : {
      "dimensions" : ["page","language","user","unpatrolled","newPage","robot","anonymous","namespace","continent","country","region","city"]
    },
    "function" : "function(str) { var parts = str.split(\"-\"); return { one: parts[0], two: parts[1] } }"
  }
```
注意这里JavaScript必须解析整段的数据，并且在JS逻辑中以`{key:value}`格式返回。这意味着展开和多维度解析需要这里一起完成。

<div class="alert alert-info" role="alert">
基于JavaScript的功能默认是禁用的。请阅读[Druid JavaScript编程指南](/TODO)关于如何使用Druid JavaScript，包括如何开启他。
</div>
#### 多值维度。
TSV和CVS数据中维度可能会有多个值。设置`parseSpec`的`listDelimiter`选项指定多值维度的分隔符。

JSON数据也可以包含多值维度。导入数据用一个JSON数组来包装这些多值的维度，不需要再`parseSpec`配置特殊注明。
