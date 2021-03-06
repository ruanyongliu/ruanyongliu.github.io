Play是一个轻量级的web框架，基于akka。这里不重点深入，也会隐去细节，简单提供一个基于sbt & scala构建的搭建步骤。

如需深入学习，建议阅读官网wiki。
##### 开始吧
### 项目目录结构
```
$application
  ├── project            # sbt配置
    ├── build.properties
    ├── plugins.sbt
  ├── src                # sources
    ├── main
      ├── public         # 静态文件目录，如html, javascripts, css文件等
      ├── resources      # 资源文件
        ├── application.conf   # play配置文件
        ├── routes             # 路由定义，主要是将资源(uri)映射到处理过程(controller)的定义
      ├── scala          # 项目文件，代码类型不仅限于scala，这里以scala为例
  ├── build.sbt          # 定义sbt的构建方式
```
上面是传统的maven组织结构，跟官方给出的结构有些出入，官方的结构是下面这样的，两类结构可以通过build.sbt配置选择，之后会说明。
```
$application
  ├── project
    ├── build.properties
    ├── plugins.sbt
  ├── app                # 项目文件，代码，对比上面结构的src/main/scala
  ├── conf               # 资源文件，对比上面结构的src/main/resources
    ├── application.conf   # play配置文件
    ├── routes             # 路由定义
  ├── public             # 静态文件目录，如html, javascripts, css文件等
  ├── build.sbt
```
### 配置
#### project/
project目录里的文件会和build.sbt共同定义sbt构建。sbt的详细说明可以参考官网文档，这里不再详细描述。
##### build.properties
```sbt.version=1.1.6 # 与本地sbt版本保持一致```
##### plugins.sbt
```
addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "0.14.6")              // 类似maven的assembly插件，将工程和依赖一起打包
addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.6.15")           // 引入play的插件
```
#### src/main/resources/
##### application.conf
Play的主要配置文件
```
# https://www.playframework.com/documentation/latest/ConfigFile
#include "extra-config.conf" # 引入其他配置
#
#mykey = ${some.value} # 自定义变量，包括使用环境变量
#mykey = ${JAVA_HOME}

## Akka
# https://www.playframework.com/documentation/latest/ScalaAkka#Configuration
# Play在内部使用akka, 并将Akka Streams、actors暴露给Websockets和其他流式http响应
akka {
  # "log-config-on-start"非常有用。在INFO级别上他记录了完整的配置，默认的和重新定义的。值得放在最顶层。
  #log-config-on-start = true
  # 例：结合logback，在src/main/resources/logback.xml添加配置：&lt;logger name="akka.actor" level="INFO" /&gt;
}

## 私钥，用于Play Session的签名
# http://www.playframework.com/documentation/latest/ApplicationSecret
#play.http.secret.key = "xxx"

## Modules
# https://www.playframework.com/documentation/latest/Modules
# https://www.playframework.com/documentation/latest/GlobalSettings
# 定义Play启动时加载的模块(modules). modules替代了原来的GlobalSettings，后者在2.5.x之后被弃用
# 也可以使用Play公开的modules: https://playframework.com/documentation/latest/ModuleDirectory
play.modules {
  # Play默认会加载Module这个类名的所有类，也可以显示定义按下面的方式。
  #enabled += my.application.Module
  #disabled += "" # 从enabled去除
}

## IDE
# https://www.playframework.com/documentation/latest/IDE
# 在dev模式下，异常抛出时能直接定位到代码位置。需要根据IDE来配置，下面是IntelliJ IDEA例子
#play.editor="http://localhost:63342/api/file/?file=%s&line=%s"

## Internationalisation i18n
# https://www.playframework.com/documentation/latest/ScalaI18N
play.i18n {
  langs = [ "zh-CN", "en" ]
}

## Play HTTP 配置
play.http {
  ## Router
  # https://www.playframework.com/documentation/latest/ScalaRouting
  # 一般在配置目录下src/main/resources创建routes文件即可，如果有其他定义，则需要在这声明。
  # 文件会被先于其他文件加载。另外文件名要对齐：例如类名叫my.application.Router，则需要在配置目录下创建my.application.routes
  #router = my.application.Router

  ## Action Creator，自定义HttpRequestHandler
  # https://www.playframework.com/documentation/latest/JavaActionCreator
  #actionCreator = null

  ## ErrorHandler，自定义错误处理过程
  #errorHandler = null

  ## Session & Flash
  # https://www.playframework.com/documentation/latest/ScalaSessionFlash
  session {
    # 是否只在https下发送cookie
    #secure = true
    # 是否只能服务端访问cookie
    #httpOnly = true
    # cookie有效时长，单位：秒。用于发送给浏览器的，所有只能作用于能丢弃cookie的浏览器。服务端只能额外记录一个时间戳来判断是否过期。
    #maxAge = 300
    # cookie域
    #domain = "example.com"
  }

  flash {
    #secure = true
    #httpOnly = true
  }
}

## Netty Provider
# https://www.playframework.com/documentation/latest/SettingsNetty
# 2.6.x以后，Play已经默认用Akka Http替换掉Netty作为Http Server，当然可以配置继续使用Netty
play.server.netty {
  #log.wire = true        # 抱歉，不懂wire什么意思
  #transport = "native"   # Linux下使用本地socket传输协议，性能更好
}

## WS (HTTP Client)
# https://www.playframework.com/documentation/latest/ScalaWS#Configuring-WS
# ws用于调用其他Http服务，使用时需要在build.sbt添加
# libraryDependencies += ws // or javaWs if using java
play.ws {
  # 使用允许302跳转
  #followRedirects = false
  # 最大Http连接数
  #ahc.maxConnectionsTotal = 50
  ## WS SSL, https验证配置
  # https://www.playframework.com/documentation/latest/WsSSL
  ssl {
    #debug.handshake = true
    #trustManager = {
    #  stores = [
    #    { type = "JKS", path = "exampletrust.jks" }
    #  ]
    #}
  }
}

## Cache
# https://www.playframework.com/documentation/latest/ScalaCache
# Play Cache组件
# libraryDependencies += cache
play.cache {
  #bindCaches = ["db-cache", "user-cache", "session-cache"]
}

## Filter Configuration
# https://www.playframework.com/documentation/latest/Filters
# 过滤器配置
play.filters {
  # enabled +=                                    # CSRFFilter, AllowedHostFilters, and SecurityHeadersFilters 默认被添加
  disabled += "play.filters.csrf.CSRFFilter"      # 从enabled去除

  ## CORS filter configuration
  # https://www.playframework.com/documentation/latest/CorsFilter
  # CORS用于直接过滤Requests。使用CSRF依赖于CORS
  cors {
    #pathPrefixes = ["/some/path", ...]               # 路径白名单
    #allowedOrigins = ["http://www.example.com"]      # host白名单
    #allowedHttpMethods = ["GET", "POST"]             # Http method白名单
  }

  ## CSRF Filter
  # https://www.playframework.com/documentation/latest/ScalaCsrf#Applying-a-global-CSRF-filter
  # https://www.playframework.com/documentation/latest/JavaCsrf#Applying-a-global-CSRF-filter
  # Play提供多种方法来验证request是否CSRF合法。基于一个CSRFtoken，通过query、表单、用户会话携带。
  csrf {
    #cookie.secure = true
    #errorHandler = MyCSRFErrorHandler   # CSRF验证失败，处理方法
  }

  ## Security headers filter configuration
  # https://www.playframework.com/documentation/latest/SecurityHeaders
  # 默认添加到response header，用于防止XSS攻击
  headers {
    #frameOptions = "DENY"                             # X-Frame-Options header
    #xssProtection = "1; mode=block"                   # X-XSS-Protection header.
    #contentTypeOptions = "nosniff"                    # X-Content-Type-Options header.
    #permittedCrossDomainPolicies = "master-only"      # X-Permitted-Cross-Domain-Policies header
    contentSecurityPolicy = "default-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'"  # Content-Security-Policy header.
  }

  ## Allowed hosts filter configuration，hosts白名单
  # https://www.playframework.com/documentation/latest/AllowedHostsFilter
  hosts {
    allowed = ["localhost:9000"]
  }
}

## Evolutions
# https://www.playframework.com/documentation/latest/Evolutions
# 用于数据库设计协同开发的。各owner只需维护sql文件，开发模式下Play会自动运行这些sql
# libraryDependencies += evolutions
play.evolutions {
  #play.evolutions.db.<datasource>.enabled=false    # 可以关闭特定数据源
}

## Database Connection Pool
# https://www.playframework.com/documentation/latest/SettingsJDBC
# libraryDependencies += jdbc
play.db {
  # 下面两项配置组成 "db.default" 表示默认的JDBC连接池
  #config = "db"
  #default = "default"

  # Play的默认连接池是HikariCP，如果使用别的连接池，下方的配置可以做相应改动
  prototype {
    #hikaricp.minimumIdle = 50
    #hikaricp.maximumPoolSize = 50
  }
}

## JDBC Datasource
# https://www.playframework.com/documentation/latest/ScalaDatabase
# JDBC方案：
# Slick (Scala preferred option): https://www.playframework.com/documentation/latest/PlaySlick
# JPA (Java preferred option): https://playframework.com/documentation/latest/JavaJPA
# EBean: https://playframework.com/documentation/latest/JavaEbean
# Anorm: https://www.playframework.com/documentation/latest/ScalaAnorm
#
# 结合play.db下的配置决定
db {
  # https://www.playframework.com/documentation/latest/Developing-with-the-H2-Database
  #default.driver = org.h2.Driver
  #default.url = "jdbc:h2:mem:play"
  #default.username = sa
  #default.password = ""

  # SQL日志
  # https://www.playframework.com/documentation/latest/Highlights25#Logging-SQL-statements
  #default.logSql=true
}

## 静态文件
# https://www.playframework.com/documentation/latest/AssetsOverview
# TODO 试改动没有生效，也没能找到问题根源
play.assets {
  path = "/public"
  urlPrefix = "/assets"
}
```
##### routes
https://www.playframework.com/documentation/2.6.x/ScalaRouting
```
# 例：
# 静态文件
GET     /assets/*file               controllers.Assets.at(path = "/public", file)
# 定义在路径上的变量
GET     /path/:var                  MyController.do(var: String)
# query的字段可以match到方法的参数上，例如/path?q1=v1
GET     /path                       MyController.do2(q1: String)
```
### build.sbt
sbt使用手册可参考：https://www.scala-sbt.org/0.13/docs/zh-cn/index.html
```
organization := "$groupId"
name := "$artifactId"
version := "1.0-SNAPSHOT"
scalaVersion := "2.11.8"

lazy val root = (project in file("."))
        .enablePlugins(PlayScala)
        .disablePlugins(PlayLayoutPlugin)    # 默认使用play官方的目录结构。添加以下两句，则使用传统的maven目录结构

PlayKeys.playMonitoredFiles ++= (sourceDirectories in (Compile, TwirlKeys.compileTemplates)).value

resolvers += Resolver.mavenLocal
libraryDependencies ++= Seq(
    guice,            # 依赖注入框架
    akkaHttpServer,   # 使用akka http server
    logback           # 打印日志
)

// 以下配置用于sbt assembly设置上线包
mainClass in assembly := Some("play.core.server.ProdServerStart")
fullClasspath in assembly += Attributed.blank(PlayKeys.playPackageAssets.value)
assemblyMergeStrategy in assembly := {
    case manifest if manifest.contains("MANIFEST.MF") =>
        MergeStrategy.discard // sbt-assembly 会自动创建MANIFEST.MF, 所以其他地方的这个文件全部丢弃
    case referenceOverrides if referenceOverrides.contains("reference-overrides.conf") =>
        MergeStrategy.concat  // reference-overrides.conf 需要全部保留
    case x =>
        val oldStrategy = (assemblyMergeStrategy in assembly).value
        oldStrategy(x)        // 其他文件使用默认合并策略
}
```
### controllers
https://www.playframework.com/documentation/2.6.x/ScalaActions#Controllers
```
import javax.inject.{Inject, Singleton}
import play.api.mvc._

@Singleton
class MyController @Inject()(cc: ControllerComponents) extends AbstractController(cc) {
    def do(var: String) = Action { request =>
        Ok("Success.")
    }
}
```
### 部署
```sbt run```
此方式会以dev模式运行，并且支持热部署，特别方便调试和测试。
若需要正式上线，则使用```sbt assembly```编译成一个jar包(```target/scala-2.11/$name-assembly-$version.jar```)，再部署(```java -jar $name-assembly-$version.jar```)在容器上。

##### 至此，服务应该就能成功启动了，默认端口为9000，访问host:9000即可。
###### 感谢阅读。文中不免有错的地方，欢迎指出。感谢！
