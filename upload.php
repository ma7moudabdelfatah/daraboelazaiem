<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$response = ['success' => false, 'message' => '', 'filePath' => ''];

try {
    // الاتصال بقاعدة البيانات
    $host = 'localhost';
    $dbname = 'hospital_db';
    $username = 'root'; // غيرها حسب إعداداتك
    $password = ''; // غيرها حسب إعداداتك
    
    $conn = new mysqli($host, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception("فشل الاتصال بقاعدة البيانات: " . $conn->connect_error);
    }
    
    // إنشاء جدول الملفات إذا لم يكن موجوداً
    $createTableSQL = "CREATE TABLE IF NOT EXISTS patient_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_code VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        file_size INT,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_patient_code (patient_code)
    )";
    
    if (!$conn->query($createTableSQL)) {
        throw new Exception("خطأ في إنشاء الجدول: " . $conn->error);
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_FILES['file']) && isset($_POST['patientCode'])) {
            $patientCode = $conn->real_escape_string($_POST['patientCode']);
            $file = $_FILES['file'];
            
            // التحقق من وجود أخطاء
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("خطأ في رفع الملف: " . $file['error']);
            }
            
            // التحقق من حجم الملف (10MB كحد أقصى)
            $maxSize = 10 * 1024 * 1024; // 10MB
            if ($file['size'] > $maxSize) {
                throw new Exception("حجم الملف أكبر من 10MB المسموح بها");
            }
            
            // إنشاء مجلد uploads إذا لم يكن موجوداً
            $uploadDir = 'uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            // إنشاء اسم فريد للملف
            $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9\._-]/', '_', $file['name']);
            $filePath = $uploadDir . $fileName;
            
            // رفع الملف
            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                // حفظ بيانات الملف في قاعدة البيانات
                $fileNameDB = $conn->real_escape_string($file['name']);
                $filePathDB = $conn->real_escape_string($filePath);
                $fileTypeDB = $conn->real_escape_string($file['type']);
                $fileSizeDB = $file['size'];
                
                $insertSQL = "INSERT INTO patient_files 
                              (patient_code, file_name, file_path, file_type, file_size) 
                              VALUES ('$patientCode', '$fileNameDB', '$filePathDB', '$fileTypeDB', $fileSizeDB)";
                
                if ($conn->query($insertSQL)) {
                    $response['success'] = true;
                    $response['message'] = 'تم رفع الملف بنجاح';
                    $response['filePath'] = $filePath;
                    $response['fileId'] = $conn->insert_id;
                } else {
                    throw new Exception("خطأ في حفظ بيانات الملف: " . $conn->error);
                }
            } else {
                throw new Exception("فشل في رفع الملف");
            }
        } else {
            throw new Exception("بيانات غير كافية");
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // جلب ملفات المريض
        if (isset($_GET['patientCode'])) {
            $patientCode = $conn->real_escape_string($_GET['patientCode']);
            
            $selectSQL = "SELECT * FROM patient_files 
                         WHERE patient_code = '$patientCode' 
                         ORDER BY upload_date DESC";
            
            $result = $conn->query($selectSQL);
            
            if ($result) {
                $files = [];
                while ($row = $result->fetch_assoc()) {
                    $files[] = [
                        'id' => $row['id'],
                        'fileName' => $row['file_name'],
                        'filePath' => $row['file_path'],
                        'fileType' => $row['file_type'],
                        'fileSize' => $row['file_size'],
                        'uploadDate' => $row['upload_date']
                    ];
                }
                
                $response['success'] = true;
                $response['files'] = $files;
                $response['count'] = count($files);
            } else {
                throw new Exception("خطأ في جلب البيانات: " . $conn->error);
            }
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // حذف ملف
        parse_str(file_get_contents("php://input"), $deleteParams);
        
        if (isset($deleteParams['fileId'])) {
            $fileId = intval($deleteParams['fileId']);
            
            // جلب مسار الملف أولاً
            $selectSQL = "SELECT file_path FROM patient_files WHERE id = $fileId";
            $result = $conn->query($selectSQL);
            
            if ($result && $row = $result->fetch_assoc()) {
                $filePath = $row['file_path'];
                
                // حذف من قاعدة البيانات
                $deleteSQL = "DELETE FROM patient_files WHERE id = $fileId";
                if ($conn->query($deleteSQL)) {
                    // حذف الملف من السيرفر
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                    
                    $response['success'] = true;
                    $response['message'] = 'تم حذف الملف بنجاح';
                } else {
                    throw new Exception("خطأ في حذف الملف: " . $conn->error);
                }
            } else {
                throw new Exception("الملف غير موجود");
            }
        }
    }
    
    $conn->close();
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>